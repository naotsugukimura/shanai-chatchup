"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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

interface AnalysisCache {
  quick?: string
  deep?: string
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
      return <h3 key={i} className="font-bold text-sm mt-3 mb-1.5 text-[#1a2744]">{line.slice(3)}</h3>
    }
    if (line.startsWith("# ")) {
      return <h2 key={i} className="font-bold text-base mt-3 mb-2 text-[#1a2744]">{line.slice(2)}</h2>
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

export function NewsDetailSheet({ selectedItem, entityMap, onClose }: NewsDetailSheetProps) {
  const [quickAnalysis, setQuickAnalysis] = useState<string | null>(null)
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null)
  const [isLoadingQuick, setIsLoadingQuick] = useState(false)
  const [isLoadingDeep, setIsLoadingDeep] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, AnalysisCache>>(new Map())

  const buildBody = useCallback((item: NewsItem) => {
    const relatedEntities = item.relatedEntityIds
      .map((id) => entityMap[id]?.name)
      .filter(Boolean)
      .join(", ")
    const cat = NEWS_CATEGORIES[item.category]
    return {
      title: item.title,
      summary: item.summary,
      source: item.source,
      date: item.date,
      category: cat?.label || item.category,
      relatedEntities: relatedEntities || undefined,
    }
  }, [entityMap])

  const fetchQuick = useCallback(async (item: NewsItem) => {
    const cached = cacheRef.current.get(item.id)?.quick
    if (cached) {
      setQuickAnalysis(cached)
      return
    }

    setIsLoadingQuick(true)
    setError(null)
    setQuickAnalysis(null)

    try {
      const res = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildBody(item), mode: "quick" }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setQuickAnalysis(data.analysis)
        const entry = cacheRef.current.get(item.id) || {}
        cacheRef.current.set(item.id, { ...entry, quick: data.analysis })
      }
    } catch {
      setError("分析の取得に失敗しました")
    } finally {
      setIsLoadingQuick(false)
    }
  }, [buildBody])

  const fetchDeep = useCallback(async (item: NewsItem) => {
    const cached = cacheRef.current.get(item.id)?.deep
    if (cached) {
      setDeepAnalysis(cached)
      return
    }

    setIsLoadingDeep(true)

    try {
      const res = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildBody(item), mode: "deep" }),
      })
      const data = await res.json()
      if (!data.error) {
        setDeepAnalysis(data.analysis)
        const entry = cacheRef.current.get(item.id) || {}
        cacheRef.current.set(item.id, { ...entry, deep: data.analysis })
      }
    } catch {
      // Silently fail for deep analysis
    } finally {
      setIsLoadingDeep(false)
    }
  }, [buildBody])

  useEffect(() => {
    if (selectedItem) {
      setDeepAnalysis(null)
      const cached = cacheRef.current.get(selectedItem.id)
      if (cached?.deep) setDeepAnalysis(cached.deep)
      fetchQuick(selectedItem)
    }
  }, [selectedItem, fetchQuick])

  if (!selectedItem) return null

  const cat = NEWS_CATEGORIES[selectedItem.category]

  return (
    <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full">
        <SheetHeader className="p-4 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge
              className="text-[10px] px-1.5 py-0 text-white border-0"
              style={{ backgroundColor: cat?.color }}
            >
              {cat?.icon} {cat?.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {selectedItem.date} / {selectedItem.source}
            </span>
          </div>
          <SheetTitle className="text-sm leading-snug">
            {selectedItem.title}
          </SheetTitle>
          <SheetDescription className="sr-only">ニュース詳細と分析</SheetDescription>
        </SheetHeader>

        {/* Article Link - prominent placement */}
        <div className="px-4 pb-2 shrink-0">
          {selectedItem.urlVerified === false ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(selectedItem.title)}`,
                  "_blank"
                )}
              >
                Googleで記事を検索
              </Button>
              <span className="text-[9px] text-amber-600 self-center">URL未確認</span>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full bg-[#1a2744] hover:bg-[#2a3754] text-white text-xs"
              onClick={() => window.open(selectedItem.url, "_blank")}
            >
              記事を読む
            </Button>
          )}
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 pb-4">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-muted-foreground mb-1">概要</p>
              <p className="text-xs leading-relaxed">{selectedItem.summary}</p>
            </div>

            {/* Related Entities */}
            {selectedItem.relatedEntityIds.length > 0 && (
              <div className="mb-3">
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

            {/* Quick Analysis (Flash) */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b">
                <span className="text-xs font-medium">AI概要分析</span>
                <span className="text-[9px] text-muted-foreground ml-auto">Flash</span>
              </div>

              {isLoadingQuick && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="w-4 h-4 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] text-muted-foreground">分析中...</p>
                </div>
              )}

              {error && !isLoadingQuick && (
                <div className="text-center py-3">
                  <p className="text-xs text-red-500 mb-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fetchQuick(selectedItem)}
                  >
                    再試行
                  </Button>
                </div>
              )}

              {quickAnalysis && (
                <div className="prose max-w-none">
                  {renderMarkdown(quickAnalysis)}
                </div>
              )}
            </div>

            {/* Deep Analysis (Pro) - on demand */}
            {quickAnalysis && (
              <div className="border-t pt-3">
                {!deepAnalysis && !isLoadingDeep && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => fetchDeep(selectedItem)}
                  >
                    より詳細な分析を見る（Pro）
                  </Button>
                )}

                {isLoadingDeep && (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <div className="w-4 h-4 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-muted-foreground">詳細分析を生成中...</p>
                  </div>
                )}

                {deepAnalysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b">
                      <span className="text-xs font-medium">詳細分析</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">Pro</span>
                    </div>
                    <div className="prose max-w-none">
                      {renderMarkdown(deepAnalysis)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
