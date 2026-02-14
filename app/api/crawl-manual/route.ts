import { NextResponse } from "next/server"
import { runDailyCrawl } from "@/lib/crawl-news"
import { seedFromJson } from "@/lib/news-store"

// 手動クローリング実行用エンドポイント（UIからのトリガー用）
export const maxDuration = 300

export async function POST() {
  try {
    // まずKVにシードデータを投入（初回のみ）
    await seedFromJson()

    // クローリング実行
    console.log("[Manual] ニュースクローリング開始...")
    const result = await runDailyCrawl()
    console.log(
      `[Manual] 完了: ${result.queriesExecuted}クエリ, ${result.newArticles}件追加`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Manual] クローリング失敗:", error)
    const msg = error instanceof Error ? error.message : "クローリング処理でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
