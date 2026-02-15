import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAllNews, getLastCrawled, removeSampleData } from "@/lib/news-store"

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

// サンプルデータ削除用
export async function POST() {
  try {
    const removed = await removeSampleData()
    revalidatePath("/")
    return NextResponse.json({
      message: `${removed}件のサンプルデータを削除しました`,
      removed,
    })
  } catch (error) {
    console.error("サンプルデータ削除エラー:", error)
    const msg = error instanceof Error ? error.message : "サンプルデータ削除でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
