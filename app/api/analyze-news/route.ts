import { NextRequest, NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini"

export async function POST(req: NextRequest) {
  try {
    const { title, summary, source, date, category, relatedEntities } = await req.json()

    if (!title || !summary) {
      return NextResponse.json({ error: "title and summary are required" }, { status: 400 })
    }

    const model = getGeminiModel()

    const prompt = `あなたはSMS障害福祉支援部の競合環境インテリジェンスアナリストです。
当社は障害福祉（障害者雇用・就労支援）領域で以下の3事業を展開しています:
- **SaaS事業**: 障害福祉事業所向けの業務支援ソフトウェア（請求・記録・計画書作成）
- **人材紹介事業**: 障害者の就職・転職支援（求人マッチング）
- **メディア事業**: 障害福祉関連の情報メディア運営

以下のニュース記事について分析してください。

## 記事情報
- タイトル: ${title}
- 日付: ${date}
- ソース: ${source}
- カテゴリ: ${category}
- 概要: ${summary}
${relatedEntities ? `- 関連エンティティ: ${relatedEntities}` : ""}

## 分析1: 事業インパクト
このニュースが当社の3事業にどのような影響を与えるか、事業ごとに簡潔に分析してください。
各事業について:
- 影響度（高/中/低/なし）
- 具体的な影響内容（1-2文）
- 推奨アクション（1項目）

## 分析2: 今後の注目ポイント
- **注視すべきこと**: 今後注目すべきポイント（3項目）
- **シナリオ予測**: 今後起こりうる展開を2-3パターン提示（楽観/中立/悲観）

回答は日本語で、マークダウン形式で構造化してください。簡潔にお願いします。`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({
      analysis: response,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("News Analysis API error:", error)
    const msg = error instanceof Error ? error.message : "ニュース分析でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
