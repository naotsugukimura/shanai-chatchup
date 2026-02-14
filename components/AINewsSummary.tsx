"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

type SummaryMode = "summary" | "impact" | "briefing"

const MODE_OPTIONS: { value: SummaryMode; label: string; icon: string; description: string }[] = [
  { value: "summary", label: "要約", icon: "📝", description: "各ニュースの要点と全体トレンド" },
  { value: "impact", label: "影響分析", icon: "📊", description: "SMS3事業への影響度を分析" },
  { value: "briefing", label: "週次ブリーフィング", icon: "📋", description: "経営層向けの週次レポート" },
]

export function AINewsSummary() {
  const [mode, setMode] = useState<SummaryMode>("summary")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    setResult("")

    try {
      const res = await fetch("/api/summarize-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, newsIds: [] }), // 全ニュース対象
      })

      const data = await res.json()
      if (data.error) {
        setResult(`⚠️ エラー: ${data.error}`)
      } else {
        setResult(data.summary)
      }
    } catch {
      setResult("⚠️ 通信エラーが発生しました。再度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }, [mode, isLoading])

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
      {/* モード選択 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              mode === opt.value
                ? "border-[#1a2744] bg-[#1a2744]/5 shadow-sm"
                : "border-transparent bg-muted/50 hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{opt.icon}</span>
              <span className="font-bold text-sm">{opt.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
          </button>
        ))}
      </div>

      {/* 生成ボタン */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-[#1a2744] hover:bg-[#2a3754] text-white px-8 py-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI生成中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              ✨ {MODE_OPTIONS.find((o) => o.value === mode)?.label}を生成
            </span>
          )}
        </Button>
      </div>

      {/* 結果表示 */}
      {result && !isLoading && (
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <span className="text-lg">
              {MODE_OPTIONS.find((o) => o.value === mode)?.icon}
            </span>
            <h3 className="font-bold text-sm">
              AI {MODE_OPTIONS.find((o) => o.value === mode)?.label}結果
            </h3>
            <span className="text-xs text-muted-foreground ml-auto">
              Gemini Pro生成
            </span>
          </div>
          <div className="prose max-w-none">{renderMarkdown(result)}</div>
        </div>
      )}
    </div>
  )
}
