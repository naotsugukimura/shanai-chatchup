"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/types"
import type { LayerDefinition } from "@/lib/types"

interface SummaryCardsProps {
  stats: DashboardStats
  layers: LayerDefinition[]
}

export function SummaryCards({ stats, layers }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">総監視対象数</p>
          <p className="text-2xl font-bold">
            {stats.filteredTotal}
            {stats.filteredTotal !== stats.total && (
              <span className="text-sm text-muted-foreground font-normal">
                {" "}/ {stats.total}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Layer別内訳</p>
          <div className="flex gap-1 flex-wrap">
            {layers.map((layer) => (
              <span
                key={layer.id}
                className="inline-flex items-center gap-0.5 text-xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="font-medium">{stats.byLayer[layer.id] ?? 0}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">高影響度</p>
          <p className="text-2xl font-bold text-impact-high">
            {stats.highImpactCount}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">要調査</p>
          <p className="text-2xl font-bold text-impact-medium">
            {stats.researchNeededCount}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
