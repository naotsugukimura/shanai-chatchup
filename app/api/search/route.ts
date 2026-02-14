import { NextRequest, NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini"
import entitiesData from "@/data/entities.json"
import { getAllNews } from "@/lib/news-store"
import riskScenariosData from "@/data/risk-scenarios.json"
import supplyChainData from "@/data/supply-chain.json"
import triggersData from "@/data/triggers.json"

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "検索クエリが空です" }, { status: 400 })
    }

    const model = getGeminiModel()

    // KVからニュースを動的に取得
    const newsItems = await getAllNews()

    // Build comprehensive context
    const entityContext = (entitiesData as { id: string; name: string; nameKana?: string; summary: string; layer: number; subCategory?: string | null; monitoringReason: string }[])
      .map((e) => `[${e.id}] ${e.name} (L${e.layer}${e.subCategory ? ", " + e.subCategory : ""}): ${e.summary} | 監視理由: ${e.monitoringReason}`)
      .join("\n")

    const newsContext = newsItems
      .map((n) => `[${n.id}][${n.date}] ${n.title}: ${n.summary}`)
      .join("\n")

    const riskContext = (riskScenariosData as { id: string; title: string; severity: string; summary: string }[])
      .map((r) => `[${r.id}][${r.severity}] ${r.title}: ${r.summary}`)
      .join("\n")

    const chainContext = (supplyChainData as { chains: { id: string; title: string; overview: string }[] }).chains
      .map((c) => `[${c.id}] ${c.title}: ${c.overview}`)
      .join("\n")

    const triggerContext = (triggersData as { id: string; title: string; summary: string; keywords: string[] }[])
      .map((t) => `[${t.id}] ${t.title}: ${t.summary} (キーワード: ${t.keywords.join(", ")})`)
      .join("\n")

    const prompt = `あなたはSMS障害福祉支援部のインテリジェンス検索AIです。
ユーザーの自然言語による質問に対し、以下のデータベースを横断検索して関連情報を返してください。

## エンティティ（32件）
${entityContext}

## ニュース
${newsContext}

## リスクシナリオ
${riskContext}

## 影響連鎖
${chainContext}

## トリガー/テーマ
${triggerContext}

## ユーザーの検索クエリ
「${query}」

以下の形式で回答してください:

### 検索結果

**関連エンティティ**: 該当するIDと名称をリスト（該当なしの場合は「なし」）
**関連ニュース**: 該当するIDとタイトルをリスト（該当なしの場合は「なし」）
**関連リスク**: 該当するIDとタイトルをリスト（該当なしの場合は「なし」）
**関連影響連鎖**: 該当するIDとタイトルをリスト（該当なしの場合は「なし」）
**関連トリガー**: 該当するIDとタイトルをリスト（該当なしの場合は「なし」）

### 分析・回答
ユーザーの質問に対する直接的な回答（3-8文）。データに基づく回答と推測を明確に区別すること。

### 推奨アクション
この情報に基づいて取るべきアクション（あれば2-3個）

回答は日本語で、簡潔に。`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ results: response })
  } catch (error) {
    console.error("Search API error:", error)
    const msg = error instanceof Error ? error.message : "AI検索でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
