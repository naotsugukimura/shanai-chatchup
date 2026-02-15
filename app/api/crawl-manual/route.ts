import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { runDailyCrawl } from "@/lib/crawl-news"
import { seedFromJson } from "@/lib/news-store"

// 手動クローリング実行用エンドポイント（UIからのトリガー用）
export const maxDuration = 300

export async function POST() {
  try {
    // まずKVにシードデータを投入（初回のみ）
    await seedFromJson()

    // クローリング実行（手動クロールはスケジュール無視で全クエリ実行）
    console.log("[Manual] ニュースクローリング開始（全クエリ実行）...")
    const result = await runDailyCrawl(true)
    console.log(
      `[Manual] 完了: ${result.queriesExecuted}クエリ, ${result.newArticles}件追加`
    )

    // ISRキャッシュを無効化してトップページを再生成
    if (result.newArticles > 0) {
      revalidatePath("/")
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Manual] クローリング失敗:", error)
    const msg = error instanceof Error ? error.message : "クローリング処理でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
