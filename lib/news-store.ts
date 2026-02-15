import { Redis } from "@upstash/redis"
import type { NewsItem } from "@/lib/types"
import fallbackNewsData from "@/data/news.json"

// Upstash Redis クライアント（環境変数未設定の場合はnull）
let redis: Redis | null = null
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
} catch {
  console.warn("Upstash Redis 接続に失敗しました。フォールバックを使用します。")
}

/** crawledAt優先 → date で降順ソート（新しいものが先） */
function sortNewsDesc(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const ta = new Date(a.crawledAt || a.date).getTime()
    const tb = new Date(b.crawledAt || b.date).getTime()
    return tb - ta
  })
}

const NEWS_KEY = "news:items"
const URLS_KEY = "news:urls"
const COUNTER_KEY = "news:counter"
const LAST_CRAWLED_KEY = "news:lastCrawled"

/**
 * 全ニュースを取得（日付降順）
 * KV未設定 or KVが空の場合は data/news.json をフォールバック
 */
export async function getAllNews(): Promise<NewsItem[]> {
  if (!redis) {
    return sortNewsDesc(fallbackNewsData as unknown as NewsItem[])
  }

  try {
    const data = await redis.get<NewsItem[]>(NEWS_KEY)
    if (data && data.length > 0) {
      return sortNewsDesc(data)
    }
  } catch (e) {
    console.error("KV読み出しエラー:", e)
  }

  // KVが空の場合、フォールバック
  return sortNewsDesc(fallbackNewsData as unknown as NewsItem[])
}

/**
 * 新規ニュースを追加（既存データとマージして保存）
 */
export async function addNews(newItems: NewsItem[]): Promise<void> {
  if (!redis || newItems.length === 0) return

  const existing = (await redis.get<NewsItem[]>(NEWS_KEY)) ?? []
  const merged = [...existing, ...newItems]

  // 180日以上前のニュースを削除（容量管理）
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 180)
  const filtered = merged.filter(
    (item) => new Date(item.date).getTime() >= cutoff.getTime()
  )

  await redis.set(NEWS_KEY, filtered)

  // URL一覧も更新
  const urls = newItems.map((item) => item.url)
  for (const url of urls) {
    await redis.sadd(URLS_KEY, url)
  }
}

/**
 * URLが既知かどうかチェック（重複排除用）
 */
export async function isUrlKnown(url: string): Promise<boolean> {
  if (!redis) return false
  try {
    return (await redis.sismember(URLS_KEY, url)) === 1
  } catch {
    return false
  }
}

/**
 * 既知の全URLを取得
 */
export async function getKnownUrls(): Promise<Set<string>> {
  if (!redis) return new Set()
  try {
    const urls = await redis.smembers(URLS_KEY)
    return new Set(urls)
  } catch {
    return new Set()
  }
}

/**
 * 次のニュースIDを自動採番（N-019, N-020, ...）
 */
export async function getNextId(): Promise<string> {
  if (!redis) return `N-${Date.now()}`
  const count = await redis.incr(COUNTER_KEY)
  return `N-${String(count).padStart(3, "0")}`
}

/**
 * 最終クロール日時を記録
 */
export async function setLastCrawled(timestamp: string): Promise<void> {
  if (!redis) return
  await redis.set(LAST_CRAWLED_KEY, timestamp)
}

/**
 * 最終クロール日時を取得
 */
export async function getLastCrawled(): Promise<string | null> {
  if (!redis) return null
  return redis.get<string>(LAST_CRAWLED_KEY)
}

/**
 * ニュース分析キャッシュを取得
 */
export async function getAnalysisCache(newsId: string, mode: string): Promise<string | null> {
  if (!redis) return null
  try {
    return redis.get<string>(`news:analysis:${mode}:${newsId}`)
  } catch {
    return null
  }
}

/**
 * ニュース分析キャッシュを保存（30日間有効）
 */
export async function setAnalysisCache(newsId: string, mode: string, analysis: string): Promise<void> {
  if (!redis) return
  try {
    await redis.set(`news:analysis:${mode}:${newsId}`, analysis, { ex: 30 * 24 * 60 * 60 })
  } catch {
    // キャッシュ保存失敗は無視
  }
}

/**
 * URL未確認の記事を削除（urlVerified === false のデータを除去）
 */
export async function removeUnverifiedNews(): Promise<number> {
  if (!redis) return 0

  const existing = (await redis.get<NewsItem[]>(NEWS_KEY)) ?? []
  const removedUrls: string[] = []

  const cleaned = existing.filter((item) => {
    if (item.urlVerified === false) {
      removedUrls.push(item.url)
      return false
    }
    return true
  })

  const removed = existing.length - cleaned.length
  if (removed === 0) return 0

  await redis.set(NEWS_KEY, cleaned)

  // URLセットからも削除
  for (const url of removedUrls) {
    await redis.srem(URLS_KEY, url)
  }

  return removed
}

/**
 * 全ニュースデータを削除（リセット用）
 */
export async function clearAllNews(): Promise<number> {
  if (!redis) return 0

  const existing = (await redis.get<NewsItem[]>(NEWS_KEY)) ?? []
  const count = existing.length
  if (count === 0) return 0

  await redis.set(NEWS_KEY, [])
  await redis.del(URLS_KEY)

  return count
}

/**
 * サンプルデータを削除（example.comやisManual=trueのデータを除去）
 */
export async function removeSampleData(): Promise<number> {
  if (!redis) return 0

  const existing = (await redis.get<NewsItem[]>(NEWS_KEY)) ?? []
  const sampleUrls: string[] = []

  const cleaned = existing.filter((item) => {
    const isSample =
      item.url.includes("example.com") ||
      (item as unknown as Record<string, unknown>).isManual === true ||
      (item.id >= "N-001" && item.id <= "N-018")
    if (isSample) sampleUrls.push(item.url)
    return !isSample
  })

  const removed = existing.length - cleaned.length
  if (removed === 0) return 0

  await redis.set(NEWS_KEY, cleaned)

  // URLセットからも削除
  for (const url of sampleUrls) {
    await redis.srem(URLS_KEY, url)
  }

  return removed
}
