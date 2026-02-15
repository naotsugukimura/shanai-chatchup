import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAllNews, getLastCrawled, removeSampleData, removeUnverifiedNews, clearAllNews } from "@/lib/news-store"

// ニュース取得API（GET）
export async function GET() {
  try {
    const news = await getAllNews()
    const lastCrawled = await getLastCrawled()

    return NextResponse.json({
      news,
      count: news.length,
      lastCrawled,
    })
  } catch (error) {
    console.error("ニュース取得エラー:", error)
    const msg = error instanceof Error ? error.message : "ニュース取得でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ニュース管理API（POST）
// action: "remove-sample" | "remove-unverified" | "clear-all"
export async function POST(req: NextRequest) {
  try {
    let action = "remove-sample"
    try {
      const body = await req.json()
      action = body.action || "remove-sample"
    } catch {
      // bodyなしの場合はデフォルトの remove-sample
    }

    let removed = 0
    let message = ""

    switch (action) {
      case "remove-unverified":
        removed = await removeUnverifiedNews()
        message = `URL未確認の${removed}件を削除しました`
        break
      case "clear-all":
        removed = await clearAllNews()
        message = `全${removed}件のニュースを削除しました`
        break
      case "remove-sample":
      default:
        removed = await removeSampleData()
        message = `${removed}件のサンプルデータを削除しました`
        break
    }

    revalidatePath("/")
    return NextResponse.json({ message, removed, action })
  } catch (error) {
    console.error("ニュース管理エラー:", error)
    const msg = error instanceof Error ? error.message : "ニュース管理でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
