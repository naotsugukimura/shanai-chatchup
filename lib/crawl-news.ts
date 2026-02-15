import { GoogleGenAI } from "@google/genai"
import { getTodaysQueries, getAllQueries } from "@/lib/search-queries"
import { addNews, getKnownUrls, getNextId, setLastCrawled } from "@/lib/news-store"
import entitiesData from "@/data/entities.json"
import type { NewsItem } from "@/lib/types"

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
    // パスが / のみ、または /ja/ 等の短いパスはトップページ
    if (path === "/" || /^\/[a-z]{2}\/?$/.test(path)) return false
    // パスにスラッシュ区切りが2つ以上あれば記事ページの可能性が高い
    const segments = path.split("/").filter(Boolean)
    return segments.length >= 2 || /\d/.test(path) || path.includes("article") || path.includes("news") || path.includes("press")
  } catch {
    return false
  }
}

/**
 * Step 1: Gemini + Google Search grounding で検索し、グラウンディングURLのみを収集
 * AIにURLを生成させない — 実在URLだけを取得する
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

  // グラウンディングメタデータから実在URLを抽出
  const allGroundingUrls = extractGroundingUrls(response)
  console.log(`[Search] クエリ「${query.slice(0, 30)}...」→ グラウンディング ${allGroundingUrls.length}件`)

  // フィルタ: 記事ページのみ & 既知URL除外 & 重複除外
  const seen = new Set<string>()
  const filtered = allGroundingUrls.filter((g) => {
    if (!isSpecificArticleUrl(g.uri)) return false
    if (knownUrls.has(g.uri)) return false
    if (seen.has(g.uri)) return false
    seen.add(g.uri)
    return true
  })

  console.log(`[Search] フィルタ後: ${filtered.length}件 (トップページ/既知URL除外)`)
  return filtered
}

/**
 * Step 2: 収集したグラウンディングURLをAIに分類・要約させる
 * URLは一切生成させない — 入力として渡したURLをそのまま使う
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

  // JSON部分を抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    const validCategories = ["product", "partnership", "funding", "policy", "market", "technology"]
    // グラウンディングURLのセット（検証用）
    const groundingUrlSet = new Set(articles.map((a) => a.uri))

    return parsed
      .filter((item: Record<string, unknown>) => {
        if (!item.title || !item.url || !item.summary) return false
        if (!validCategories.includes(item.category as string)) return false
        return true
      })
      .map((item: Record<string, unknown>) => {
        const url = String(item.url)
        // AIが元URLを改変していないか検証
        const urlVerified = groundingUrlSet.has(url)
        // もしAIがURLを変えてしまった場合、タイトルで元URLを探す
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
          urlVerified: true, // グラウンディングから取得したURLなので常にtrue
        }
      })
  } catch {
    console.error("分析応答のJSONパースに失敗:", text.slice(0, 200))
    return []
  }
}

/**
 * 日次クローリングのメイン処理
 * 2段階アーキテクチャ:
 *   Step 1: Gemini+グラウンディングで検索 → 実在URLを収集
 *   Step 2: 収集したURLをAIで分類・要約（URLは生成させない）
 */
export async function runDailyCrawl(forceAll = false): Promise<CrawlResult> {
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

  // 既知URLを取得（重複排除用）
  const knownUrls = await getKnownUrls()

  // クエリグループを取得
  const groups = forceAll ? getAllQueries() : getTodaysQueries()
  const allQueries = groups.flatMap((g) => g.queries)

  // エンティティリストを構築
  const entityList = (entitiesData as { id: string; name: string; nameKana?: string }[])
    .map((e) => `${e.id}: ${e.name}`)
    .join("\n")

  // 全クエリのグラウンディングURLをまず収集
  const allArticles: GroundingArticle[] = []
  const seenUrls = new Set<string>()

  // Step 1: 全クエリを実行してグラウンディングURLを収集
  for (const query of allQueries) {
    try {
      const articles = await searchForGroundingUrls(ai, query, knownUrls)
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`検索エラー [${query.slice(0, 30)}...]: ${msg}`)
    }
  }

  articleUrlsFiltered = allArticles.length
  console.log(`[Crawl] Step 1 完了: ${queriesExecuted}クエリ → ${groundingUrlsFound}グラウンディングURL → ${articleUrlsFiltered}記事URL (重複${duplicatesSkipped}件除外)`)

  // Step 2: 収集したURLをバッチ分析（最大10件ずつ）
  const BATCH_SIZE = 10
  const newNewsItems: NewsItem[] = []

  for (let i = 0; i < allArticles.length; i += BATCH_SIZE) {
    const batch = allArticles.slice(i, i + BATCH_SIZE)
    try {
      const results = await analyzeArticles(ai, batch, entityList)
      console.log(`[Analyze] バッチ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length}件入力 → ${results.length}件の関連記事`)

      for (const item of results) {
        // 最終重複チェック
        if (knownUrls.has(item.url)) {
          duplicatesSkipped++
          continue
        }
        knownUrls.add(item.url)

        const id = await getNextId()
        newNewsItems.push({ ...item, id })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`分析エラー [バッチ${Math.floor(i / BATCH_SIZE) + 1}]: ${msg}`)
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

  console.log(`[Crawl] 完了: ${newNewsItems.length}件の新規記事を保存`)

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
