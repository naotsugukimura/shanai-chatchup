import { GoogleGenAI } from "@google/genai"
import { getTodaysQueries, getAllQueries } from "@/lib/search-queries"
import { addNews, getKnownUrls, getNextId, setLastCrawled } from "@/lib/news-store"
import entitiesData from "@/data/entities.json"
import type { NewsItem } from "@/lib/types"

interface CrawlResult {
  queriesExecuted: number
  rawResults: number
  duplicatesSkipped: number
  newArticles: number
  errors: string[]
  timestamp: string
}

/**
 * groundingMetadata からソースURLを抽出
 */
function extractGroundingUrls(
  response: Awaited<ReturnType<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>>
): { uri: string; title: string }[] {
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
 * GeminiのJSON出力URLをgroundingのソースURLで補正し、検証フラグを付与
 */
function correctAndVerifyUrls(
  items: { title: string; url: string; urlVerified?: boolean; [key: string]: unknown }[],
  groundingUrls: { uri: string; title: string }[]
): void {
  const groundingUrlSet = new Set(groundingUrls.map((g) => g.uri))
  const articleUrls = groundingUrls.filter((g) => isSpecificArticleUrl(g.uri))

  for (const item of items) {
    // AI生成URLがgroundingに完全一致 → 検証済み
    if (groundingUrlSet.has(item.url)) {
      item.urlVerified = true
      continue
    }

    // タイトルマッチでgroundingから補正
    const titleLower = item.title.toLowerCase()
    const match = articleUrls.find((g) => {
      const gTitleLower = g.title.toLowerCase()
      return (
        gTitleLower.includes(titleLower.slice(0, 15)) ||
        titleLower.includes(gTitleLower.slice(0, 15))
      )
    })

    if (match) {
      item.url = match.uri
      item.urlVerified = true
    } else {
      // ドメインマッチを試みる
      try {
        const itemDomain = new URL(item.url).hostname
        const domainMatch = articleUrls.find((g) => {
          try { return new URL(g.uri).hostname === itemDomain } catch { return false }
        })
        if (domainMatch) {
          item.url = domainMatch.uri
          item.urlVerified = true
        } else {
          item.urlVerified = false
        }
      } catch {
        item.urlVerified = false
      }
    }
  }
}

/**
 * Gemini + Google Search grounding でニュースを検索・分析
 * Custom Search JSON API の代替（新規利用不可のため）
 */
async function searchAndAnalyze(
  query: string,
  entityList: string,
  knownUrls: Set<string>
): Promise<{ results: Omit<NewsItem, "id">[]; rawCount: number; dupCount: number }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が未設定です")
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `あなたは障害福祉業界のニュース分析AIです。
以下の検索クエリに基づいてGoogle検索を行い、障害福祉・障害者雇用・就労支援に関連するニュース記事を見つけて分析してください。

## 検索クエリ
${query}

## ルール
- 直近3日以内の日本語ニュース記事のみ対象
- 障害福祉・障害者雇用・就労支援に無関係な記事は除外
- 最大5件まで
- ★重要★ urlは必ずその記事の具体的なURLを返してください（サイトのトップページやHPのURLではなく、記事個別のURL）
- categoryは必ず以下の6つのいずれか: product, partnership, funding, policy, market, technology
- summaryは100文字以内の日本語
- relatedEntityIdsは以下のエンティティリストから該当するものを選択（該当なしなら空配列）
- dateは記事の公開日をYYYY-MM-DD形式（不明なら今日の日付: ${new Date().toISOString().slice(0, 10)}）
- sourceはサイト名

## 除外するURL（既に取得済み）
以下のURLはスキップしてください:
${[...knownUrls].slice(0, 50).join("\n") || "(なし)"}

## エンティティリスト
${entityList}

## 出力形式（JSON配列のみ返してください、他のテキストは不要）
該当記事がない場合は空配列 [] を返してください。
[
  {
    "title": "記事タイトル",
    "url": "https://example.com/news/2026/02/15/article-slug（記事個別のURL）",
    "source": "メディア名",
    "date": "YYYY-MM-DD",
    "category": "policy",
    "summary": "100文字以内の要約",
    "relatedEntityIds": ["L1-001"],
    "rawResultCount": 5
  }
]

rawResultCountは最初のオブジェクトにだけ含め、Google検索で見つかった総記事数を記載してください。`

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  })

  const text = response.text ?? ""

  // groundingMetadataからソースURLを抽出
  const groundingUrls = extractGroundingUrls(response)
  console.log(`[Grounding] ${groundingUrls.length}件のソースURL取得:`, groundingUrls.map((g) => g.uri).join(", "))

  // JSON部分を抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return { results: [], rawCount: 0, dupCount: 0 }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return { results: [], rawCount: 0, dupCount: 0 }

    // rawResultCountを取得
    const rawCount = parsed[0]?.rawResultCount ?? parsed.length

    // GeminiのURLをgroundingソースで補正
    correctAndVerifyUrls(parsed, groundingUrls)

    // バリデーション & 重複排除
    const validCategories = ["product", "partnership", "funding", "policy", "market", "technology"]
    let dupCount = 0

    const results = parsed
      .filter((item: Record<string, unknown>) => {
        if (!item.title || !item.url || !item.summary || !validCategories.includes(item.category as string)) {
          return false
        }
        if (knownUrls.has(String(item.url))) {
          dupCount++
          return false
        }
        return true
      })
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
        urlVerified: item.urlVerified === true,
      }))

    return { results, rawCount, dupCount }
  } catch {
    console.error("Gemini応答のJSONパースに失敗:", text.slice(0, 200))
    return { results: [], rawCount: 0, dupCount: 0 }
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

  // エンティティリストを構築
  const entityList = (entitiesData as { id: string; name: string; nameKana?: string }[])
    .map((e) => `${e.id}: ${e.name}`)
    .join("\n")

  // 収集した全URLを追跡（クエリ間の重複排除）
  const seenUrls = new Set<string>()

  // 全ニュースアイテム
  const newNewsItems: NewsItem[] = []

  for (const query of allQueries) {
    try {
      const { results, rawCount, dupCount } = await searchAndAnalyze(query, entityList, knownUrls)
      queriesExecuted++
      rawResults += rawCount
      duplicatesSkipped += dupCount

      for (const item of results) {
        // クエリ間の重複排除
        if (seenUrls.has(item.url)) {
          duplicatesSkipped++
          continue
        }
        seenUrls.add(item.url)
        knownUrls.add(item.url) // 次のクエリでも排除

        const id = await getNextId()
        newNewsItems.push({ ...item, id })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー"
      errors.push(`検索・分析エラー [${query.slice(0, 30)}...]: ${msg}`)
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
