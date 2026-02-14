"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { RiskScenario } from "@/lib/types"

interface AIRiskAnalysisProps {
  scenarios: RiskScenario[]
}

export function AIRiskAnalysis({ scenarios }: AIRiskAnalysisProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState("")
  const [customScenario, setCustomScenario] = useState("")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [useCustom, setUseCustom] = useState(false)

  const handleAnalyze = useCallback(async () => {
    if (isLoading) return
    if (!useCustom && !selectedScenarioId) return
    if (useCustom && !customScenario.trim()) return

    setIsLoading(true)
    setResult("")

    try {
      const res = await fetch("/api/analyze-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: useCustom ? null : selectedScenarioId,
          customScenario: useCustom ? customScenario.trim() : null,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setResult(`⚠️ エラー: ${data.error}`)
      } else {
        setResult(data.analysis)
      }
    } catch {
      setResult("⚠️ 通信エラーが発生しました。再度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, useCustom, selectedScenarioId, customScenario])

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-100 text-red-700 border-red-200"
      case "high": return "bg-orange-100 text-orange-700 border-orange-200"
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      default: return "bg-green-100 text-green-700 border-green-200"
    }
  }

  const severityLabel = (s: string) => {
    switch (s) {
      case "critical": return "🔴 重大"
      case "high": return "🟠 高"
      case "medium": return "🟡 中"
      default: return "🟢 低"
    }
  }

  // マークダウン簡易レンダリング
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h4 key={i} className="font-bold text-sm mt-3 mb-1 text-[#1a2744]">{line.slice(4)}</h4>
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="font-bold text-base mt-4 mb-2 text-[#1a2744] border-b pb-1">{line.slice(3)}</h3>
      }
      if (line.startsWith("# ")) {
        return <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-[#1a2744]">{line.slice(2)}</h2>
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={i} className="ml-4 text-sm leading-relaxed">{renderBold(line.slice(2))}</li>
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={i} className="ml-4 text-sm leading-relaxed list-decimal">{renderBold(line.replace(/^\d+\.\s/, ""))}</li>
      }
      if (line.trim() === "") {
        return <br key={i} />
      }
      return <p key={i} className="text-sm leading-relaxed">{renderBold(line)}</p>
    })
  }

  const renderBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-[#1a2744]">{part}</strong> : part
    )
  }

  return (
    <div className="space-y-4">
      {/* モード切替 */}
      <div className="flex gap-2">
        <button
          onClick={() => setUseCustom(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            !useCustom ? "bg-[#1a2744] text-white" : "bg-muted hover:bg-muted/80"
          }`}
        >
          📋 既存シナリオを分析
        </button>
        <button
          onClick={() => setUseCustom(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            useCustom ? "bg-[#1a2744] text-white" : "bg-muted hover:bg-muted/80"
          }`}
        >
          ✏️ カスタムシナリオ
        </button>
      </div>

      {!useCustom ? (
        /* 既存シナリオ選択 */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenarioId(s.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedScenarioId === s.id
                  ? "border-[#1a2744] bg-[#1a2744]/5 shadow-sm"
                  : "border-transparent hover:border-gray-200 bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColor(s.severity)}`}>
                  {severityLabel(s.severity)}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.id}</span>
              </div>
              <p className="font-bold text-sm mb-1">{s.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{s.summary}</p>
            </button>
          ))}
        </div>
      ) : (
        /* カスタムシナリオ入力 */
        <div className="space-y-2">
          <label className="text-sm font-medium">分析したいリスクシナリオを入力</label>
          <textarea
            value={customScenario}
            onChange={(e) => setCustomScenario(e.target.value)}
            placeholder="例: 大手IT企業がAIを活用した無料の請求ソフトをリリースした場合の影響..."
            className="w-full text-sm border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30 min-h-[100px] resize-y"
            disabled={isLoading}
          />
        </div>
      )}

      {/* 分析実行ボタン */}
      <div className="flex justify-center">
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || (!useCustom && !selectedScenarioId) || (useCustom && !customScenario.trim())}
          className="bg-[#1a2744] hover:bg-[#2a3754] text-white px-8 py-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI深層分析中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              🧠 AIでリスク深層分析
            </span>
          )}
        </Button>
      </div>

      {/* 分析結果 */}
      {result && !isLoading && (
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <span className="text-lg">🧠</span>
            <h3 className="font-bold text-sm">AIリスク深層分析結果</h3>
            <span className="text-xs text-muted-foreground ml-auto">Gemini Pro生成</span>
          </div>
          <div className="prose max-w-none">{renderMarkdown(result)}</div>
        </div>
      )}
    </div>
  )
}
