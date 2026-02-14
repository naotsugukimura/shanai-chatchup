"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "./SearchBar"
import type { NewsItem, Entity } from "@/lib/types"
import { NEWS_CATEGORIES } from "@/lib/constants"
import { createIdMap } from "@/lib/utils"

interface NewsTimelineProps {
  news: NewsItem[]
  entities: Entity[]
}

export function NewsTimeline({ news, entities }: NewsTimelineProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">総ニュース数</p>
          <p className="text-2xl font-bold">{news.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">関連エンティティ</p>
          <p className="text-2xl font-bold">
            {new Set(news.flatMap((n) => n.relatedEntityIds)).size}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">直近7日</p>
          <p className="text-2xl font-bold text-blue-500">
            {news.filter((n) => {
              const d = new Date(n.date)
              const now = new Date()
              return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000
            }).length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">政策関連</p>
          <p className="text-2xl font-bold text-red-500">
            {categoryCounts["policy"] || 0}
          </p>
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
            return (
              <div key={item.id} className="relative pl-10">
                <div
                  className="absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-background"
                  style={{ backgroundColor: cat?.color ?? "#6b7280" }}
                />
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className="text-[10px] px-1.5 py-0 text-white border-0"
                          style={{ backgroundColor: cat?.color }}
                        >
                          {cat?.icon} {cat?.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {item.date}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          / {item.source}
                        </span>
                      </div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sm hover:text-blue-600 hover:underline block mb-1.5"
                    >
                      {item.title}
                    </a>

                    <p className="text-xs text-muted-foreground mb-2">
                      {item.summary}
                    </p>

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
    </div>
  )
}
