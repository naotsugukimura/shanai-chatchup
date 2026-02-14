"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

export function AISearchPanel() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setResults("")

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      })

      const data = await res.json()
      if (data.error) {
        setResults(`⚠️ エラー: ${data.error}`)
      } else {
        setResults(data.results)
      }
    } catch {
      setResults("⚠️ 通信エラーが発生しました。再度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }, [query, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // マークダウン簡易レンダリング
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h4 key={i} className="font-bold text-sm mt-3 mb-1 text-[#1a2744]">{line.slice(4)}</h4>
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="font-bold text-base mt-4 mb-1 text-[#1a2744]">{line.slice(3)}</h3>
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
      {/* 検索バー */}
      <div className="bg-gradient-to-r from-[#1a2744] to-[#2a3754] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h2 className="text-lg font-bold">AI横断検索</h2>
            <p className="text-xs opacity-70">エンティティ・ニュース・リスク・トリガーを自然言語で検索</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例: LITALICOのSaaS事業の脅威は？ / 報酬改定の影響 / 人材紹介の競合"
            className="flex-1 text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            disabled={isLoading}
          />
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
            className="bg-white text-[#1a2744] hover:bg-white/90 font-bold px-6"
          >
            {isLoading ? "検索中..." : "検索"}
          </Button>
        </div>

        {/* サンプルクエリ */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "knowbeとかんたん請求の違い",
            "2027年報酬改定のリスク",
            "AI技術の影響",
            "就労移行支援の競合",
          ].map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 結果表示 */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">AIが検索・分析中...</span>
          </div>
        </div>
      )}

      {results && !isLoading && (
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <div className="prose max-w-none">{renderMarkdown(results)}</div>
        </div>
      )}
    </div>
  )
}
