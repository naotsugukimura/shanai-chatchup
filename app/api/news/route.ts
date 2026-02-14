import { NextResponse } from "next/server"
import { getAllNews, getLastCrawled, seedFromJson } from "@/lib/news-store"

// ニュース取得API（GET）+ 初期データ投入（POST）
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

// 初期データ投入用（KVにdata/news.jsonをシード）
export async function POST() {
  try {
    const count = await seedFromJson()
    return NextResponse.json({
      message: `${count}件のニュースをKVに投入しました`,
      count,
    })
  } catch (error) {
    console.error("シードエラー:", error)
    const msg = error instanceof Error ? error.message : "データ投入でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
