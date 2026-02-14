import { NextRequest, NextResponse } from "next/server"
import { getGeminiModel } from "@/lib/gemini"
import entitiesData from "@/data/entities.json"
import riskScenariosData from "@/data/risk-scenarios.json"
import supplyChainData from "@/data/supply-chain.json"

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, customScenario } = await req.json()

    const model = getGeminiModel()

    const entitySummaries = (entitiesData as { id: string; name: string; summary: string; layer: number }[])
      .map((e) => `[${e.id}] ${e.name} (L${e.layer}): ${e.summary}`)
      .join("\n")

    const riskSummaries = (riskScenariosData as { id: string; title: string; severity: string; summary: string; detail: string; mitigationActions: string[] }[])
      .map((r) => `[${r.id}][${r.severity}] ${r.title}: ${r.summary}\n詳細: ${r.detail}\n緩和策: ${r.mitigationActions.join(", ")}`)
      .join("\n\n")

    const chainSummaries = (supplyChainData as { chains: { title: string; overview: string }[] }).chains
      .map((c) => `${c.title}: ${c.overview}`)
      .join("\n\n")

    let targetRisk = ""
    if (scenarioId) {
      const scenario = (riskScenariosData as { id: string; title: string; detail: string }[]).find((r) => r.id === scenarioId)
      if (scenario) {
        targetRisk = `分析対象: [${scenarioId}] ${scenario.title}\n${scenario.detail}`
      }
    } else if (customScenario) {
      targetRisk = `ユーザー指定シナリオ: ${customScenario}`
    }

    const prompt = `あなたはSMS障害福祉支援部のリスク分析AIアシスタントです。
以下のデータを基に、指定されたリスクシナリオの深層分析を行ってください。

## 監視対象エンティティ
${entitySummaries}

## 既存リスクシナリオ
${riskSummaries}

## 影響連鎖
${chainSummaries}

## 分析対象
${targetRisk}

以下の観点で分析してください:
1. **波及影響分析**: このリスクが発生した場合、どのエンティティにどのような影響が連鎖するか
2. **確率評価**: 発生可能性（高/中/低）とその根拠
3. **タイムライン**: いつ頃顕在化する可能性があるか
4. **SMS への影響**: 人材紹介・メディア・SaaS の3事業への具体的影響
5. **推奨アクション**: 優先度順の具体的対策（3-5個）
6. **早期警戒指標**: この リスクが顕在化する前に検知できるシグナル

回答は日本語で、構造化して出力してください。マークダウン形式で見出しを使ってください。`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ analysis: response })
  } catch (error) {
    console.error("Risk Analysis API error:", error)
    const msg = error instanceof Error ? error.message : "リスク分析でエラーが発生しました"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
