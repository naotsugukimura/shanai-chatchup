"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NewsItem, Entity } from "@/lib/types"
import { NEWS_CATEGORIES } from "@/lib/constants"

interface NewsDetailSheetProps {
  selectedItem: NewsItem | null
  entityMap: Record<string, Entity>
  onClose: () => void
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-[#1a2744]">{part}</strong> : part
  )
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) {
      return <h4 key={i} className="font-bold text-sm mt-3 mb-1 text-[#1a2744]">{line.slice(4)}</h4>
    }
    if (line.startsWith("## ")) {
      return <h3 key={i} className="font-bold text-base mt-4 mb-2 text-[#1a2744]">{line.slice(3)}</h3>
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

export function NewsDetailSheet({ selectedItem, entityMap, onClose }: NewsDetailSheetProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, string>>(new Map())

  const fetchAnalysis = useCallback(async (item: NewsItem) => {
    // Check cache first
    const cached = cacheRef.current.get(item.id)
    if (cached) {
      setAnalysis(cached)
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const relatedEntities = item.relatedEntityIds
        .map((id) => entityMap[id]?.name)
        .filter(Boolean)
        .join(", ")

      const cat = NEWS_CATEGORIES[item.category]
      const res = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          summary: item.summary,
          source: item.source,
          date: item.date,
          category: cat?.label || item.category,
          relatedEntities: relatedEntities || undefined,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAnalysis(data.analysis)
        cacheRef.current.set(item.id, data.analysis)
      }
    } catch {
      setError("分析の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [entityMap])

  useEffect(() => {
    if (selectedItem) {
      fetchAnalysis(selectedItem)
    }
  }, [selectedItem, fetchAnalysis])

  if (!selectedItem) return null

  const cat = NEWS_CATEGORIES[selectedItem.category]

  return (
    <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge
              className="text-[10px] px-1.5 py-0 text-white border-0"
              style={{ backgroundColor: cat?.color }}
            >
              {cat?.icon} {cat?.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {selectedItem.date}
            </span>
            <span className="text-[10px] text-muted-foreground">
              / {selectedItem.source}
            </span>
            {selectedItem.urlVerified === false && (
              <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                URL未確認
              </span>
            )}
          </div>
          <SheetTitle className="text-base leading-snug">
            {selectedItem.title}
          </SheetTitle>
          <SheetDescription className="sr-only">ニュース詳細と分析</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">概要</p>
            <p className="text-sm">{selectedItem.summary}</p>
          </div>

          {/* Related Entities */}
          {selectedItem.relatedEntityIds.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1.5">関連エンティティ</p>
              <div className="flex gap-1.5 flex-wrap">
                {selectedItem.relatedEntityIds.map((id) => {
                  const entity = entityMap[id]
                  return entity ? (
                    <span
                      key={id}
                      className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-blue-600"
                    >
                      {entity.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <span className="text-sm">AI分析</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Gemini Pro</span>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">分析を生成中...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-6">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAnalysis(selectedItem)}
                >
                  再試行
                </Button>
              </div>
            )}

            {analysis && (
              <div className="prose max-w-none">
                {renderMarkdown(analysis)}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t p-4">
          {selectedItem.urlVerified === false ? (
            <div className="w-full space-y-2">
              <p className="text-[10px] text-amber-600">
                この記事のURLは自動取得のため、正確でない可能性があります
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(selectedItem.title)}`,
                  "_blank"
                )}
              >
                Googleで記事を検索
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-[#1a2744] hover:bg-[#2a3754] text-white"
              onClick={() => window.open(selectedItem.url, "_blank")}
            >
              記事を読む
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
