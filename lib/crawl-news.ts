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
 * GoogleリダイレクトURLを実URLに解決する
 */
async function resolveRedirectUrl(redirectUrl: string): Promise<string> {
  if (!redirectUrl.includes("vertexaisearch.cloud.google.com")) {
    return redirectUrl
  }
  try {
    const res = await fetch(redirectUrl, { redirect: "manual" })
    const location = res.headers.get("location")
    if (location) return location
  } catch {
    // フォールバック: リダイレクト解決に失敗
  }
  return redirectUrl
}

/**
 * 複数のリダイレクトURLを並列で実URLに解決する
 */
async function resolveAllRedirectUrls(
  articles: GroundingArticle[]
): Promise<GroundingArticle[]> {
  const resolved: GroundingArticle[] = []
  // 5並列でリダイレクト解決
  for (let i = 0; i < articles.length; i += 5) {
    const batch = articles.slice(i, i + 5)
    const results = await Promise.allSettled(
      batch.map(async (a) => {
        const realUrl = await resolveRedirectUrl(a.uri)
        return { uri: realUrl, title: a.title }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") {
        resolved.push(r.value)
      }
    }
  }
  return resolved
}

/**
 * URLが具体的な記事ページかどうか判定（HPトップを除外）
 */
function isSpecificArticleUrl(url: string): boolean {
  try {
    // GoogleリダイレクトURLは解決前なのでスキップ
    if (url.includes("vertexaisearch.cloud.google.com")) return true
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
 * URLからページの本文テキストを簡易取得（先頭2000文字）
 */
async function fetchPageSnippet(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ""
    const html = await res.text()
    // HTMLタグを除去してテキスト抽出
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return text.slice(0, 2000)
  } catch {
    return ""
  }
}

/**
 * Step 2: 収集したグラウンディングURLをAIに分類・要約させる
 * 各URLの実際のページ内容を取得してプロンプトに含める
 */
async function analyzeArticles(
  ai: InstanceType<typeof GoogleGenAI>,
  articles: GroundingArticle[],
  entityList: string
): Promise<Omit<NewsItem, "id">[]> {
  if (articles.length === 0) return []

  // 各記事のページ本文を並列取得（5並列）
  const snippets: string[] = new Array(articles.length).fill("")
  for (let i = 0; i < articles.length; i += 5) {
    const batch = articles.slice(i, i + 5)
    const results = await Promise.allSettled(
      batch.map((a) => fetchPageSnippet(a.uri))
    )
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        snippets[i + j] = (results[j] as PromiseFulfilledResult<string>).value
      }
    }
  }

  const articlesList = articles
    .map((a, i) => {
      const snippet = snippets[i]
      return `${i + 1}. URL: ${a.uri}\n   タイトル: ${a.title}${snippet ? `\n   本文抜粋: ${snippet.slice(0, 500)}` : ""}`
    })
    .join("\n\n")

  const analyzePrompt = `あなたは障害福祉業界の専門ニュース分析AIです。
以下の記事リスト（URL・タイトル・本文抜粋）を分析し、**障害福祉・障害者雇用・就労支援に本当に関連する記事だけ**をJSON配列で返してください。

## 記事リスト
${articlesList}

## フィルタリング基準（厳格に適用してください）
★最重要★ 以下に該当する記事は必ず除外してください：
- 本文抜粋を読んで障害福祉・障害者雇用・就労支援について具体的に触れていない記事
- 一般的な人材・転職ニュースで障害者雇用に特化していないもの
- 一般的な介護ニュースで障害福祉に触れていないもの
- 個人ブログ・noteの個人的な感想や日記
- 企業のトップページや事業紹介ページ（ニュース記事ではないもの）
- 求人情報ページや事業所一覧ページ
- 内容が不明確で判断できないもの（「可能性がある」で推測しない）

★重要★ 迷ったら除外してください。質の高いニュース記事だけを残します。

## 出力ルール
- urlの値は上記リストのURLをそのまま使ってください。URLを変更・生成しないでください。
- titleは「どの企業/団体が何をしたのか」が一目でわかる日本語タイトルにしてください。「某社」「ある企業」のような曖昧な表現は禁止。例:「LITALICO、就労支援向け新SaaSツールを発表」
- categoryは必ず以下の6つのいずれか: product, partnership, funding, policy, market, technology
- impactは自社事業（SaaS・人材紹介・メディア事業を運営する障害福祉サービス企業）への影響度: high, medium, low
- summaryは本文抜粋の内容に基づいた100文字以内の日本語要約（推測ではなく実際の内容を要約）
- relatedEntityIdsは以下のエンティティリストから該当するものを選択
- dateは記事の公開日（YYYY-MM-DD、不明なら${new Date().toISOString().slice(0, 10)}）
- sourceはサイト名

## エンティティリスト
${entityList}

## 出力形式（JSON配列のみ、他のテキスト不要）
関連記事がない場合は空配列 [] を返してください。
[
  {
    "title": "記事タイトル",
    "url": "上記リストのURLをそのままコピー",
    "source": "サイト名",
    "date": "YYYY-MM-DD",
    "category": "policy",
    "impact": "high",
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
          impact: (["high", "medium", "low"].includes(item.impact as string)
            ? item.impact as NewsItem["impact"]
            : "medium"),
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

  console.log(`[Crawl] Step 1 完了 (${Math.round((Date.now() - startTime) / 1000)}秒): ${groundingUrlsFound} → ${allArticles.length}件リダイレクトURL`)

  // タイムガード: Step 1だけで時間がかかりすぎた場合
  if (Date.now() - startTime > TIME_LIMIT_MS) {
    errors.push("タイムアウト: Step 1完了後に時間切れ")
    await setLastCrawled(timestamp)
    return { queriesExecuted, groundingUrlsFound, articleUrlsFiltered, duplicatesSkipped, newArticles: 0, errors, timestamp }
  }

  // Step 1.5: リダイレクトURLを実URLに解決
  console.log(`[Crawl] Step 1.5: ${allArticles.length}件のリダイレクトURLを解決中...`)
  const resolvedArticles = await resolveAllRedirectUrls(allArticles)

  // 解決後に実URLで重複チェック・フィルタリング
  const finalArticles: GroundingArticle[] = []
  const resolvedSeen = new Set<string>()
  for (const article of resolvedArticles) {
    // リダイレクト解決に失敗したもの（GoogleリダイレクトURLのまま）は除外
    if (article.uri.includes("vertexaisearch.cloud.google.com")) continue
    // トップページ除外
    if (!isSpecificArticleUrl(article.uri)) continue
    // 既知URL除外
    if (knownUrls.has(article.uri)) {
      duplicatesSkipped++
      continue
    }
    // 重複除外
    if (resolvedSeen.has(article.uri)) {
      duplicatesSkipped++
      continue
    }
    resolvedSeen.add(article.uri)
    finalArticles.push(article)
  }

  articleUrlsFiltered = finalArticles.length
  console.log(`[Crawl] Step 1.5 完了 (${Math.round((Date.now() - startTime) / 1000)}秒): ${resolvedArticles.length} → ${articleUrlsFiltered}件の実URL`)

  // タイムガード
  if (Date.now() - startTime > TIME_LIMIT_MS) {
    errors.push("タイムアウト: URL解決後に時間切れ")
    await setLastCrawled(timestamp)
    return { queriesExecuted, groundingUrlsFound, articleUrlsFiltered, duplicatesSkipped, newArticles: 0, errors, timestamp }
  }

  // Step 2: バッチ分析を並列実行（10件ずつのバッチを3並列）
  const BATCH_SIZE = 10
  const batches: GroundingArticle[][] = []
  for (let i = 0; i < finalArticles.length; i += BATCH_SIZE) {
    batches.push(finalArticles.slice(i, i + BATCH_SIZE))
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
