"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "./SearchBar"
import { NewsDetailSheet } from "./NewsDetailSheet"
import type { NewsItem, Entity } from "@/lib/types"
import { NEWS_CATEGORIES } from "@/lib/constants"
import { createIdMap } from "@/lib/utils"

interface NewsTimelineProps {
  news: NewsItem[]
  entities: Entity[]
  lastCrawled: string | null
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "たった今"
  if (diffMin < 60) return `${diffMin}分前`
  if (diffHour < 24) return `${diffHour}時間前`
  if (diffDay < 7) return `${diffDay}日前`
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
}

function isNewArticle(crawledAt: string | undefined): boolean {
  if (!crawledAt) return false
  const date = new Date(crawledAt)
  const now = new Date()
  // 24時間以内にクロールされた記事はNEW
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000
}

export function NewsTimeline({ news, entities, lastCrawled }: NewsTimelineProps) {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null)
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlResult, setCrawlResult] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleManualCrawl = useCallback(async () => {
    if (isCrawling) return
    setIsCrawling(true)
    setCrawlResult(null)

    try {
      const res = await fetch("/api/crawl-manual", { method: "POST" })
      const data = await res.json()
      if (data.error) {
        setCrawlResult(`❌ エラー: ${data.error}`)
      } else {
        setCrawlResult(
          `✅ ${data.queriesExecuted}クエリ実行 → ${data.newArticles}件の新規ニュースを取得${data.errors?.length > 0 ? ` (警告${data.errors.length}件)` : ""}`
        )
        // 3秒後にページリロード（新しいニュースを表示）
        if (data.newArticles > 0) {
          setTimeout(() => window.location.reload(), 3000)
        }
      }
    } catch {
      setCrawlResult("❌ 通信エラーが発生しました")
    } finally {
      setIsCrawling(false)
    }
  }, [isCrawling])

  const entityMap = useMemo(() => createIdMap(entities), [entities])

  const filteredNews = useMemo(() => {
    let items = [...news].sort((a, b) => b.date.localeCompare(a.date))

    if (selectedCategory) {
      items = items.filter((n) => n.category === selectedCategory)
    }

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.source.toLowerCase().includes(q) ||
          n.relatedEntityIds.some((id) => {
            const entity = entityMap[id]
            return entity && entity.name.toLowerCase().includes(q)
          })
      )
    }

    return items
  }, [news, search, selectedCategory, entityMap])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of news) {
      counts[n.category] = (counts[n.category] || 0) + 1
    }
    return counts
  }, [news])

  // 新着記事数（24時間以内にクロールされた記事） - mountedで再計算
  const newArticleCount = useMemo(
    () => mounted ? news.filter((n) => isNewArticle(n.crawledAt)).length : 0,
    [news, mounted]
  )

  // 直近7日のニュース数 - mountedで再計算
  const recentCount = useMemo(() => {
    if (!mounted) return 0
    const now = new Date()
    return news.filter((n) => {
      const d = new Date(n.date)
      return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000
    }).length
  }, [news, mounted])

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">総ニュース数</p>
          <p className="text-2xl font-bold">{news.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">新着 (24h)</p>
          <p className="text-2xl font-bold text-green-500">
            {newArticleCount > 0 ? `+${newArticleCount}` : "0"}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">直近7日</p>
          <p className="text-2xl font-bold text-blue-500">{recentCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">政策関連</p>
          <p className="text-2xl font-bold text-red-500">
            {categoryCounts["policy"] || 0}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">最終更新</p>
          <p className="text-lg font-bold" suppressHydrationWarning>
            {lastCrawled && mounted ? formatRelativeTime(lastCrawled) : lastCrawled ? "-" : "未取得"}
          </p>
          {lastCrawled && mounted && (
            <p className="text-[10px] text-muted-foreground mt-0.5" suppressHydrationWarning>
              {new Date(lastCrawled).toLocaleString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="max-w-md flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(NEWS_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                selectedCategory === key
                  ? "text-white border-transparent"
                  : "text-muted-foreground hover:border-foreground/30"
              }`}
              style={selectedCategory === key ? { backgroundColor: cat.color } : {}}
            >
              {cat.icon} {cat.label}
              {categoryCounts[key] ? ` (${categoryCounts[key]})` : ""}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredNews.length} 件表示
        {filteredNews.length !== news.length && ` (全 ${news.length} 件中)`}
      </p>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {filteredNews.map((item) => {
            const cat = NEWS_CATEGORIES[item.category]
            const isNew = mounted && isNewArticle(item.crawledAt)
            return (
              <div key={item.id} className="relative pl-10">
                <div
                  className="absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-background"
                  style={{ backgroundColor: cat?.color ?? "#6b7280" }}
                />
                <Card className={isNew ? "ring-1 ring-green-400/50 bg-green-50/30 dark:bg-green-950/10" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className="text-[10px] px-1.5 py-0 text-white border-0"
                          style={{ backgroundColor: cat?.color }}
                        >
                          {cat?.icon} {cat?.label}
                        </Badge>
                        {isNew && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-500 text-white border-0 animate-pulse">
                            NEW
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {item.date}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          / {item.source}
                        </span>
                      </div>
                      {item.crawledAt && mounted && (
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          取得 {formatRelativeTime(item.crawledAt)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedItem(item)}
                      className="font-bold text-sm hover:text-blue-600 hover:underline block mb-1.5 text-left cursor-pointer"
                    >
                      {item.title}
                    </button>

                    <p className="text-xs text-muted-foreground mb-2">
                      {item.summary}
                    </p>

                    {item.urlVerified === false && !item.isManual && (
                      <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        URL未確認
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">関連:</span>
                      {item.relatedEntityIds.map((id) => {
                        const entity = entityMap[id]
                        return entity ? (
                          <a
                            key={id}
                            href={`/entity/${id}`}
                            className="text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 text-blue-600"
                          >
                            {entity.name}
                          </a>
                        ) : null
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">該当するニュースがありません</p>
          <p className="text-sm">検索条件を変更してください</p>
        </div>
      )}

      {/* Manual crawl - small link at bottom */}
      <div className="pt-8 text-center">
        <button
          onClick={handleManualCrawl}
          disabled={isCrawling}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50"
        >
          {isCrawling ? "取得中..." : "手動取得"}
        </button>
        {crawlResult && (
          <p className="text-[10px] text-muted-foreground mt-1">{crawlResult}</p>
        )}
      </div>

      <NewsDetailSheet
        selectedItem={selectedItem}
        entityMap={entityMap}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}
