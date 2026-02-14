import { NextRequest, NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini"
import entitiesData from "@/data/entities.json"
import newsData from "@/data/news.json"

export async function POST(req: NextRequest) {
  try {
    const { newsIds, mode } = await req.json()
    // mode: "summary" | "impact" | "briefing"

    const model = getGeminiModel()

    const entityMap = Object.fromEntries(
      (entitiesData as { id: string; name: string; layer: number }[]).map((e) => [e.id, e])
    )

    const allNews = newsData as { id: string; title: string; date: string; source: string; summary: string; relatedEntityIds: string[]; category: string }[]
    const targetNews = newsIds && newsIds.length > 0
      ? allNews.filter((n) => newsIds.includes(n.id))
      : allNews

    const newsContext = targetNews
      .map((n) => {
        const relatedNames = n.relatedEntityIds
          .map((id: string) => entityMap[id]?.name || id)
          .join(", ")
        return `[${n.date}] ${n.title} (${n.source})\n  分類: ${n.category}\n  関連: ${relatedNames}\n  概要: ${n.summary}`
      })
      .join("\n\n")

    let instruction = ""
    switch (mode) {
      case "impact":
        instruction = `以下のニュースについて、SMS障害福祉支援部の3事業（人材紹介・メディア・SaaS）への影響度を分析してください。

各ニュースについて:
- **影響度**: 高🔴/中🟡/低🟢
- **影響を受ける事業**: 人材紹介/メディア/SaaS
- **具体的影響**: 1-2文で簡潔に
- **推奨アクション**: 具体的な対応策

最後に全体のまとめ（3-5文）を付けてください。`
        break
      case "briefing":
        instruction = `以下のニュースを元に、SMS障害福祉支援部の週次ブリーフィング資料を作成してください。

## フォーマット
1. **今週のハイライト**（最重要ニュース3件、各2-3文）
2. **業界動向サマリー**（5文以内で全体傾向）
3. **競合動向**（注目すべき競合の動き）
4. **規制・政策動向**（制度変更の動き）
5. **来週の注目ポイント**（2-3項目）

簡潔かつ経営判断に役立つ情報を中心にまとめてください。`
        break
      default:
        instruction = `以下のニュースを要約してください。

各ニュースについて:
- **要点**: 1文の要約
- **重要度**: ★★★/★★/★（SMS事業への関連度）
- **キーワード**: 関連するキーワード3個

最後に「全体トレンド」として、これらのニュースから読み取れる業界全体の方向性を3-5文でまとめてください。`
        break
    }

    const prompt = `あなたはSMS障害福祉支援部の情報分析AIアシスタントです。

## ニュース一覧
${newsContext}

${instruction}

回答は日本語で、マークダウン形式で構造化してください。`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ summary: response })
  } catch (error) {
    console.error("News Summary API error:", error)
    const msg = error instanceof Error ? error.message : "ニュース要約でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
