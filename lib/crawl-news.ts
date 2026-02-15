import { GoogleGenAI } from "@google/genai"
import { getTodaysQueries, getAllQueries } from "@/lib/search-queries"
import { addNews, getKnownUrls, getNextId, setLastCrawled } from "@/lib/news-store"
import entitiesData from "@/data/entities.json"
import type { NewsItem } from "@/lib/types"

// 並列実行数の上限
const MAX_PARALLEL = 3
// Vercel関数のタイムアウト（余裕を持たせて250秒）
const TIME_LIMIT_MS = 250_000

interface CrawlResult {
  queriesExecuted: number
  groundingUrlsFound: number
  articleUrlsFiltered: number
  duplicatesSkipped: number
  newArticles: number
  errors: string[]
  timestamp: string
}

interface GroundingArticle {
  uri: string
  title: string
}

/**
 * groundingMetadata からソースURLを抽出
 */
function extractGroundingUrls(
  response: Awaited<ReturnType<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>>
): GroundingArticle[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (response as any)?.candidates?.[0]
    const metadata = candidate?.groundingMetadata
    if (!metadata?.groundingChunks) return []

    return metadata.groundingChunks
      .filter((chunk: { web?: { uri?: string; title?: string } }) => chunk.web?.uri)
      .map((chunk: { web: { uri: string; title?: string } }) => ({
        uri: chunk.web.uri,
        title: chunk.web.title || "",
      }))
  } catch {
    return []
  }
}

/**
 * URLが具体的な記事ページかどうか判定（HPトップを除外）
 */
function isSpecificArticleUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const path = u.pathname
    if (path === "/" || /^\/[a-z]{2}\/?$/.test(path)) return false
    const segments = path.split("/").filter(Boolean)
    return segments.length >= 2 || /\d/.test(path) || path.includes("article") || path.includes("news") || path.includes("press")
  } catch {
    return false
  }
}

/**
 * 配列をN個ずつの並列バッチで実行
 */
async function runInParallelBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<{ results: R[]; errors: string[] }> {
  const results: R[] = []
  const errors: string[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map(fn))

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value)
      } else {
        errors.push(result.reason?.message || "不明なエラー")
      }
    }
  }

  return { results, errors }
}

/**
 * Step 1: Gemini + Google Search grounding で検索し、グラウンディングURLのみを収集
 */
async function searchForGroundingUrls(
  ai: InstanceType<typeof GoogleGenAI>,
  query: string,
  knownUrls: Set<string>
): Promise<GroundingArticle[]> {
  const searchPrompt = `以下の検索クエリに関連する最新のニュース記事を探してください。
直近7日以内の日本語の記事に限定してください。

検索クエリ: ${query}

見つかった記事のタイトルと内容の概要を簡潔に箇条書きで教えてください。URLは返さなくて結構です。`

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  })

  const allGroundingUrls = extractGroundingUrls(response)
  console.log(`[Search] 「${query.slice(0, 30)}...」→ ${allGroundingUrls.length}件`)

  const seen = new Set<string>()
  return allGroundingUrls.filter((g) => {
    if (!isSpecificArticleUrl(g.uri)) return false
    if (knownUrls.has(g.uri)) return false
    if (seen.has(g.uri)) return false
    seen.add(g.uri)
    return true
  })
}

/**
 * Step 2: 収集したグラウンディングURLをAIに分類・要約させる
 */
async function analyzeArticles(
  ai: InstanceType<typeof GoogleGenAI>,
  articles: GroundingArticle[],
  entityList: string
): Promise<Omit<NewsItem, "id">[]> {
  if (articles.length === 0) return []

  const articlesList = articles
    .map((a, i) => `${i + 1}. URL: ${a.uri}\n   タイトル: ${a.title}`)
    .join("\n")

  const analyzePrompt = `あなたは障害福祉業界のニュース分析AIです。
以下の記事リストを分析し、障害福祉・障害者雇用・就労支援に関連するものだけをJSON配列で返してください。

## 記事リスト
${articlesList}

## ルール
- 障害福祉・障害者雇用・就労支援に無関係な記事は除外してください
- ★最重要★ urlの値は上記リストのURLをそのまま使ってください。URLを変更・生成しないでください。
- categoryは必ず以下の6つのいずれか: product, partnership, funding, policy, market, technology
- summaryは100文字以内の日本語で記事内容を要約
- relatedEntityIdsは以下のエンティティリストから該当するものを選択（該当なしなら空配列）
- dateは記事の公開日をYYYY-MM-DD形式（不明なら今日の日付: ${new Date().toISOString().slice(0, 10)}）
- sourceはサイト名（URLのドメインから推定）

## エンティティリスト
${entityList}

## 出力形式（JSON配列のみ返してください、他のテキストは不要）
関連記事がない場合は空配列 [] を返してください。
[
  {
    "title": "記事タイトル",
    "url": "上記リストのURLをそのままコピー",
    "source": "サイト名",
    "date": "YYYY-MM-DD",
    "category": "policy",
    "summary": "100文字以内の要約",
    "relatedEntityIds": ["L1-001"]
  }
]`

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: analyzePrompt,
  })

  const text = response.text ?? ""
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    const validCategories = ["product", "partnership", "funding", "policy", "market", "technology"]
    const groundingUrlSet = new Set(articles.map((a) => a.uri))

    return parsed
      .filter((item: Record<string, unknown>) => {
        if (!item.title || !item.url || !item.summary) return false
        if (!validCategories.includes(item.category as string)) return false
        return true
      })
      .map((item: Record<string, unknown>) => {
        const url = String(item.url)
        const urlVerified = groundingUrlSet.has(url)
        let finalUrl = url
        if (!urlVerified) {
          const titleMatch = articles.find((a) =>
            a.title && String(item.title).includes(a.title.slice(0, 15))
          )
          if (titleMatch) {
            finalUrl = titleMatch.uri
          }
        }

        return {
          title: String(item.title),
          url: finalUrl,
          source: String(item.source || "不明"),
          date: String(item.date || new Date().toISOString().slice(0, 10)),
          category: item.category as NewsItem["category"],
          summary: String(item.summary).slice(0, 150),
          relatedEntityIds: Array.isArray(item.relatedEntityIds)
            ? (item.relatedEntityIds as string[]).filter((id) => typeof id === "string")
            : [],
          crawledAt: new Date().toISOString(),
          isManual: false,
          urlVerified: true,
        }
      })
  } catch {
    console.error("分析応答のJSONパースに失敗:", text.slice(0, 200))
    return []
  }
}

/**
 * 日次クローリングのメイン処理
 * 2段階アーキテクチャ（並列化版）:
 *   Step 1: Gemini+グラウンディングで検索 → 実在URLを収集（3並列）
 *   Step 2: 収集したURLをAIで分類・要約（3並列バッチ）
 *   タイムガード: 250秒で途中でも保存して終了
 */
export async function runDailyCrawl(forceAll = false): Promise<CrawlResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const timestamp = new Date().toISOString()
  let queriesExecuted = 0
  let groundingUrlsFound = 0
  let articleUrlsFiltered = 0
  let duplicatesSkipped = 0

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      queriesExecuted: 0,
      groundingUrlsFound: 0,
      articleUrlsFiltered: 0,
      duplicatesSkipped: 0,
      newArticles: 0,
      errors: ["GEMINI_API_KEY が未設定です"],
      timestamp,
    }
  }

  const ai = new GoogleGenAI({ apiKey })
  const knownUrls = await getKnownUrls()
  const groups = forceAll ? getAllQueries() : getTodaysQueries()
  const allQueries = groups.flatMap((g) => g.queries)

  const entityList = (entitiesData as { id: string; name: string; nameKana?: string }[])
    .map((e) => `${e.id}: ${e.name}`)
    .join("\n")

  // Step 1: 検索を並列実行（3並列）
  console.log(`[Crawl] Step 1: ${allQueries.length}クエリを${MAX_PARALLEL}並列で検索...`)

  const allArticles: GroundingArticle[] = []
  const seenUrls = new Set<string>()

  const { results: searchResults, errors: searchErrors } = await runInParallelBatches(
    allQueries,
    MAX_PARALLEL,
    (query) => searchForGroundingUrls(ai, query, knownUrls)
  )

  for (const err of searchErrors) {
    errors.push(`検索エラー: ${err}`)
  }

  for (const articles of searchResults) {
    queriesExecuted++
    groundingUrlsFound += articles.length

    for (const article of articles) {
      if (seenUrls.has(article.uri)) {
        duplicatesSkipped++
        continue
      }
      seenUrls.add(article.uri)
      allArticles.push(article)
    }
  }

  articleUrlsFiltered = allArticles.length
  console.log(`[Crawl] Step 1 完了 (${Math.round((Date.now() - startTime) / 1000)}秒): ${groundingUrlsFound} → ${articleUrlsFiltered}記事URL`)

  // タイムガード: Step 1だけで時間がかかりすぎた場合
  if (Date.now() - startTime > TIME_LIMIT_MS) {
    errors.push("タイムアウト: Step 1完了後に時間切れ")
    await setLastCrawled(timestamp)
    return { queriesExecuted, groundingUrlsFound, articleUrlsFiltered, duplicatesSkipped, newArticles: 0, errors, timestamp }
  }

  // Step 2: バッチ分析を並列実行（10件ずつのバッチを3並列）
  const BATCH_SIZE = 10
  const batches: GroundingArticle[][] = []
  for (let i = 0; i < allArticles.length; i += BATCH_SIZE) {
    batches.push(allArticles.slice(i, i + BATCH_SIZE))
  }

  console.log(`[Crawl] Step 2: ${batches.length}バッチを${MAX_PARALLEL}並列で分析...`)

  const newNewsItems: NewsItem[] = []

  const { results: analyzeResults, errors: analyzeErrors } = await runInParallelBatches(
    batches,
    MAX_PARALLEL,
    (batch) => analyzeArticles(ai, batch, entityList)
  )

  for (const err of analyzeErrors) {
    errors.push(`分析エラー: ${err}`)
  }

  for (const results of analyzeResults) {
    // タイムガード
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      errors.push("タイムアウト: 分析途中で時間切れ（取得済み分は保存）")
      break
    }

    for (const item of results) {
      if (knownUrls.has(item.url)) {
        duplicatesSkipped++
        continue
      }
      knownUrls.add(item.url)
      const id = await getNextId()
      newNewsItems.push({ ...item, id })
    }
  }

  // KVに保存
  if (newNewsItems.length > 0) {
    try {
      await addNews(newNewsItems)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`KV保存エラー: ${msg}`)
    }
  }

  await setLastCrawled(timestamp)

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log(`[Crawl] 完了 (${elapsed}秒): ${newNewsItems.length}件保存`)

  return {
    queriesExecuted,
    groundingUrlsFound,
    articleUrlsFiltered,
    duplicatesSkipped,
    newArticles: newNewsItems.length,
    errors,
    timestamp,
  }
}
