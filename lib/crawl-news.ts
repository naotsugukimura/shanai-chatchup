import { getGeminiModel } from "@/lib/gemini"
import { getTodaysQueries, getAllQueries } from "@/lib/search-queries"
import { addNews, getKnownUrls, getNextId, setLastCrawled } from "@/lib/news-store"
import entitiesData from "@/data/entities.json"
import type { NewsItem } from "@/lib/types"

interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
}

interface CrawlResult {
  queriesExecuted: number
  rawResults: number
  duplicatesSkipped: number
  newArticles: number
  errors: string[]
  timestamp: string
}

/**
 * Google Custom Search API でニュースを検索
 */
async function searchGoogle(query: string): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cseId = process.env.GOOGLE_CSE_ID

  if (!apiKey || !cseId) {
    throw new Error("GOOGLE_API_KEY または GOOGLE_CSE_ID が未設定です")
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    num: "5",
    dateRestrict: "d3",  // 直近3日以内
    lr: "lang_ja",       // 日本語のみ
    gl: "jp",            // 日本リージョン
  })

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Search API エラー (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  if (!data.items) return []

  return data.items.map((item: { title: string; link: string; snippet: string; displayLink: string }) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet || "",
    displayLink: item.displayLink || "",
  }))
}

/**
 * Gemini で検索結果を分析し、NewsItem形式に変換
 */
async function analyzeWithGemini(
  results: GoogleSearchResult[]
): Promise<Omit<NewsItem, "id">[]> {
  if (results.length === 0) return []

  const model = getGeminiModel()

  // エンティティリストを構築
  const entityList = (entitiesData as { id: string; name: string; nameKana?: string }[])
    .map((e) => `${e.id}: ${e.name}`)
    .join("\n")

  const articlesText = results
    .map(
      (r, i) =>
        `[${i + 1}] タイトル: ${r.title}\nURL: ${r.link}\nサイト: ${r.displayLink}\n抜粋: ${r.snippet}`
    )
    .join("\n\n")

  const prompt = `あなたは障害福祉業界のニュース分析AIです。
以下のニュース検索結果を分析し、各記事をJSON配列で返してください。

## ルール
- 障害福祉・障害者雇用・就労支援に無関係な記事は除外（空配列にする）
- categoryは必ず以下の6つのいずれか: product, partnership, funding, policy, market, technology
- summaryは100文字以内の日本語
- relatedEntityIdsは以下のエンティティリストから該当するものを選択（該当なしなら空配列）
- dateは記事の公開日をYYYY-MM-DD形式で推定（不明なら今日の日付）
- sourceはサイト名（ドメインから推定）

## エンティティリスト
${entityList}

## 記事リスト
${articlesText}

## 出力形式（JSON配列のみ返してください、他のテキストは不要）
[
  {
    "title": "記事タイトル",
    "url": "記事URL",
    "source": "メディア名",
    "date": "YYYY-MM-DD",
    "category": "policy",
    "summary": "100文字以内の要約",
    "relatedEntityIds": ["L1-001"]
  }
]`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // JSON部分を抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    // バリデーション
    const validCategories = ["product", "partnership", "funding", "policy", "market", "technology"]
    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          item.title && item.url && item.summary && validCategories.includes(item.category as string)
      )
      .map((item: Record<string, unknown>) => ({
        title: String(item.title),
        url: String(item.url),
        source: String(item.source || "不明"),
        date: String(item.date || new Date().toISOString().slice(0, 10)),
        category: item.category as NewsItem["category"],
        summary: String(item.summary).slice(0, 150),
        relatedEntityIds: Array.isArray(item.relatedEntityIds)
          ? (item.relatedEntityIds as string[]).filter((id) => typeof id === "string")
          : [],
        crawledAt: new Date().toISOString(),
        isManual: false,
      }))
  } catch {
    console.error("Gemini応答のJSONパースに失敗:", text.slice(0, 200))
    return []
  }
}

/**
 * 日次クローリングのメイン処理
 */
export async function runDailyCrawl(forceAll = false): Promise<CrawlResult> {
  const errors: string[] = []
  const timestamp = new Date().toISOString()
  let queriesExecuted = 0
  let rawResults = 0
  let duplicatesSkipped = 0

  // 既知URLを取得（重複排除用）
  const knownUrls = await getKnownUrls()

  // クエリグループを取得（forceAll=trueの場合は全グループ、それ以外は今日の曜日分のみ）
  const groups = forceAll ? getAllQueries() : getTodaysQueries()
  const allQueries = groups.flatMap((g) => g.queries)

  // 全検索結果を収集
  const allSearchResults: GoogleSearchResult[] = []

  for (const query of allQueries) {
    try {
      const results = await searchGoogle(query)
      queriesExecuted++
      rawResults += results.length
      allSearchResults.push(...results)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`検索エラー [${query.slice(0, 30)}...]: ${msg}`)
    }
  }

  // URL重複排除（検索結果間 + 既存データ）
  const uniqueResults: GoogleSearchResult[] = []
  const seenUrls = new Set<string>()

  for (const result of allSearchResults) {
    if (knownUrls.has(result.link) || seenUrls.has(result.link)) {
      duplicatesSkipped++
      continue
    }
    seenUrls.add(result.link)
    uniqueResults.push(result)
  }

  if (uniqueResults.length === 0) {
    await setLastCrawled(timestamp)
    return {
      queriesExecuted,
      rawResults,
      duplicatesSkipped,
      newArticles: 0,
      errors,
      timestamp,
    }
  }

  // Gemini で分析（5件ずつバッチ）
  const newNewsItems: NewsItem[] = []
  const batchSize = 5

  for (let i = 0; i < uniqueResults.length; i += batchSize) {
    const batch = uniqueResults.slice(i, i + batchSize)
    try {
      const analyzed = await analyzeWithGemini(batch)
      for (const item of analyzed) {
        const id = await getNextId()
        newNewsItems.push({ ...item, id })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`Gemini分析エラー (バッチ${Math.floor(i / batchSize) + 1}): ${msg}`)
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

  return {
    queriesExecuted,
    rawResults,
    duplicatesSkipped,
    newArticles: newNewsItems.length,
    errors,
    timestamp,
  }
}
