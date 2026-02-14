import { NextRequest, NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini"
import entitiesData from "@/data/entities.json"
import supplyChainData from "@/data/supply-chain.json"
import riskScenariosData from "@/data/risk-scenarios.json"

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "メッセージが空です" }, { status: 400 })
    }

    const model = getGeminiModel()

    // Build context from our data
    const entitySummaries = (entitiesData as { id: string; name: string; summary: string; layer: number }[])
      .map((e) => `[${e.id}] ${e.name} (L${e.layer}): ${e.summary}`)
      .join("\n")

    const chainSummaries = (supplyChainData as { chains: { title: string; overview: string }[] }).chains
      .map((c) => `${c.title}: ${c.overview}`)
      .join("\n\n")

    const riskSummaries = (riskScenariosData as { id: string; title: string; severity: string; summary: string }[])
      .map((r) => `[${r.severity}] ${r.title}: ${r.summary}`)
      .join("\n")

    const systemPrompt = `あなたはSMS障害福祉支援部の競合環境インテリジェンスアシスタントです。
以下のデータを基に、障害福祉業界の競合動向・市場分析・リスクについて回答してください。
回答は日本語で、簡潔かつ具体的にお願いします。データに基づかない推測は「推測ですが」と明記してください。

## 監視対象エンティティ（32件）
${entitySummaries}

## 影響連鎖（4チェーン）
${chainSummaries}

## リスクシナリオ
${riskSummaries}
`

    // Build chat history
    const chatHistory = (history ?? []).map((h: { role: string; text: string }) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }],
    }))

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "了解しました。SMS障害福祉支援部の競合環境インテリジェンスアシスタントとして、32の監視対象エンティティ、4つの影響連鎖、リスクシナリオのデータに基づいて回答します。何でもお聞きください。" }] },
        ...chatHistory,
      ],
    })

    const result = await chat.sendMessage(message)
    const response = result.response.text()

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    const msg = error instanceof Error ? error.message : "AI処理でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
