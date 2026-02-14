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
    return (fallbackNewsData as unknown as NewsItem[]).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  try {
    const data = await redis.get<NewsItem[]>(NEWS_KEY)
    if (data && data.length > 0) {
      return data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    }
  } catch (e) {
    console.error("KV読み出しエラー:", e)
  }

  // KVが空の場合、フォールバック
  return (fallbackNewsData as unknown as NewsItem[]).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
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
 * 初回セットアップ: data/news.json の18件をKVに投入
 */
export async function seedFromJson(): Promise<number> {
  if (!redis) return 0

  const existing = await redis.get<NewsItem[]>(NEWS_KEY)
  if (existing && existing.length > 0) {
    return existing.length // 既にデータあり
  }

  const seedData = (fallbackNewsData as unknown as NewsItem[]).map((item) => ({
    ...item,
    isManual: true,
  }))

  await redis.set(NEWS_KEY, seedData)

  // URLをセットに追加
  for (const item of seedData) {
    await redis.sadd(URLS_KEY, item.url)
  }

  // カウンターを18に設定
  await redis.set(COUNTER_KEY, seedData.length)

  return seedData.length
}
