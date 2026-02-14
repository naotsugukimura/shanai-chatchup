"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: "user", text: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ エラー: ${data.error}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.response },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ 通信エラーが発生しました。再度お試しください。" },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // マークダウン風の簡易レンダリング
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h4 key={i} className="font-bold text-sm mt-2 mb-1">{line.slice(4)}</h4>
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>
      }
      if (line.startsWith("# ")) {
        return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={i} className="ml-4 text-xs leading-relaxed">{renderBold(line.slice(2))}</li>
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={i} className="ml-4 text-xs leading-relaxed list-decimal">{renderBold(line.replace(/^\d+\.\s/, ""))}</li>
      }
      if (line.trim() === "") {
        return <br key={i} />
      }
      return <p key={i} className="text-xs leading-relaxed">{renderBold(line)}</p>
    })
  }

  const renderBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1a2744] text-white rounded-full shadow-lg hover:bg-[#2a3754] transition-all flex items-center justify-center text-2xl"
        title="AIアシスタント"
      >
        🤖
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-[#1a2744] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-bold">SCI AIアシスタント</p>
            <p className="text-[10px] opacity-70">Gemini Pro搭載</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-1 rounded hover:bg-white/10 transition"
            title="チャット履歴をクリア"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-sm opacity-70 hover:opacity-100 px-2 py-1 rounded hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-3xl mb-3">🤖</p>
            <p className="text-sm font-medium mb-2">AIアシスタントへようこそ</p>
            <p className="text-xs">競合動向・市場分析・リスクについて質問できます</p>
            <div className="mt-4 space-y-2">
              {[
                "LITALICOの最新動向は？",
                "SaaS事業の主なリスクは？",
                "法定雇用率の影響を教えて",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    inputRef.current?.focus()
                  }}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted transition"
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-[#1a2744] text-white"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs">{renderMarkdown(msg.text)}</div>
                ) : (
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 入力エリア */}
      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力... (Shift+Enterで改行)"
            className="flex-1 text-xs resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30 min-h-[36px] max-h-[80px]"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="bg-[#1a2744] hover:bg-[#2a3754] text-white shrink-0 h-9 px-3"
          >
            送信
          </Button>
        </div>
      </div>
    </div>
  )
}
