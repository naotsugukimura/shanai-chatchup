"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LayerBadge } from "./LayerBadge"
import { ImpactBadge } from "./ImpactBadge"
import { BusinessTag } from "./BusinessTag"
import type { Entity, LayerDefinition } from "@/lib/types"
import { getFrequencyLabel, getStatusLabel, getLayerBorderColor } from "@/lib/utils"

interface EntityCardProps {
  entity: Entity
  layer?: LayerDefinition
  isExpanded: boolean
  onToggleExpand: () => void
}

export function EntityCard({
  entity,
  layer,
  isExpanded,
  onToggleExpand,
}: EntityCardProps) {
  return (
    <Card className={`border-l-4 ${getLayerBorderColor(entity.layer)} overflow-hidden`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <LayerBadge layer={entity.layer} name={layer?.name} size="sm" />
              <ImpactBadge level={entity.impactLevel} size="sm" />
              {entity.status === "research_needed" && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                  要調査
                </span>
              )}
            </div>
            {entity.officialUrl && (
              <a
                href={entity.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                公式
              </a>
            )}
          </div>

          <h3 className="font-bold text-sm mb-1">{entity.name}</h3>
          {entity.subCategory && (
            <p className="text-[11px] text-muted-foreground mb-1">
              {entity.subCategory}
            </p>
          )}
          {entity.operator && (
            <p className="text-[11px] text-muted-foreground mb-1">
              運営: {entity.operator}
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {entity.summary}
          </p>

          <div className="flex items-center gap-1 flex-wrap mb-2">
            {entity.affectedBusiness.map((b) => (
              <BusinessTag key={b} business={b} />
            ))}
            {entity.stockCode && (
              <span className="text-[10px] text-muted-foreground">
                [{entity.stockCode}]
              </span>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-6 text-xs">
              {isExpanded ? "閉じる ▲" : "詳細 ▼"}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t space-y-3 text-xs">
              <div>
                <p className="font-semibold mb-1">監視理由</p>
                <p className="text-muted-foreground leading-relaxed">
                  {entity.monitoringReason}
                </p>
              </div>

              {entity.monitoringPoints.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">監視ポイント</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {entity.monitoringPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <div>
                  <p className="font-semibold mb-0.5">推奨頻度</p>
                  <p className="text-muted-foreground">
                    {getFrequencyLabel(entity.recommendedFrequency)}
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-0.5">ステータス</p>
                  <p className="text-muted-foreground">
                    {getStatusLabel(entity.status)}
                  </p>
                </div>
              </div>

              {entity.sources.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">推奨情報ソース</p>
                  <ul className="space-y-1">
                    {entity.sources.map((source, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {source.name}
                        </a>
                        <span className="text-muted-foreground">
                          ({source.frequency})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entity.notes && (
                <div>
                  <p className="font-semibold mb-0.5">備考</p>
                  <p className="text-muted-foreground">{entity.notes}</p>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/entity/${entity.id}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  詳細ページを開く →
                </Link>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}
