import { NextRequest, NextResponse } from "next/server"
import { runDailyCrawl } from "@/lib/crawl-news"

// Vercel Cron から呼び出される日次クローリングエンドポイント
// maxDuration: Vercel Pro で最大300秒
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Vercel Cron のセキュリティ検証
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "認証エラー: CRON_SECRET が一致しません" },
      { status: 401 }
    )
  }

  try {
    console.log("[Cron] ニュースクローリング開始...")
    const result = await runDailyCrawl()
    console.log(
      `[Cron] 完了: ${result.queriesExecuted}クエリ実行, ${result.newArticles}件追加, ${result.duplicatesSkipped}件重複スキップ`
    )

    if (result.errors.length > 0) {
      console.warn("[Cron] エラー:", result.errors)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Cron] クローリング失敗:", error)
    const msg = error instanceof Error ? error.message : "クローリング処理でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
