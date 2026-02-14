"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ImpactBadge } from "./ImpactBadge"
import { BusinessTag } from "./BusinessTag"
import type { Trigger } from "@/lib/trigger-types"
import { TRIGGER_CATEGORIES } from "@/lib/trigger-types"
import { TRIGGER_STATUS_MAP } from "@/lib/constants"
import { getStatusLabel } from "@/lib/utils"

interface TriggerCardProps {
  trigger: Trigger
  isExpanded: boolean
  onToggleExpand: () => void
}

function getStatusColor(status: string): string {
  return TRIGGER_STATUS_MAP[status]?.color ?? "bg-gray-400 text-white"
}

export function TriggerCard({
  trigger,
  isExpanded,
  onToggleExpand,
}: TriggerCardProps) {
  const category = TRIGGER_CATEGORIES.find((c) => c.id === trigger.category)

  return (
    <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: category?.color ?? "#6b7280" }}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                className="text-[10px] px-1.5 py-0 text-white border-0"
                style={{ backgroundColor: category?.color }}
              >
                {category?.icon} {category?.name}
              </Badge>
              <ImpactBadge level={trigger.impactLevel} size="sm" />
              <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getStatusColor(trigger.status)}`}>
                {getStatusLabel(trigger.status)}
              </Badge>
            </div>
          </div>

          <h3 className="font-bold text-sm mb-1">{trigger.title}</h3>
          {trigger.timeframe && (
            <p className="text-[11px] text-muted-foreground mb-1">
              時期: {trigger.timeframe}
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {trigger.summary}
          </p>

          <div className="flex items-center gap-1 flex-wrap mb-1">
            {trigger.affectedBusiness.map((b) => (
              <BusinessTag key={b} business={b} />
            ))}
          </div>

          <div className="flex items-center gap-1 flex-wrap mb-2">
            {trigger.keywords.slice(0, 4).map((kw) => (
              <span
                key={kw}
                className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
              >
                {kw}
              </span>
            ))}
            {trigger.keywords.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{trigger.keywords.length - 4}
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
                  {trigger.monitoringReason}
                </p>
              </div>

              {trigger.monitoringPoints.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">監視ポイント</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {trigger.monitoringPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {trigger.expectedDate && (
                <div>
                  <p className="font-semibold mb-0.5">想定時期</p>
                  <p className="text-muted-foreground">{trigger.expectedDate}</p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-0.5">キーワード</p>
                <div className="flex gap-1 flex-wrap">
                  {trigger.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="bg-muted px-1.5 py-0.5 rounded text-[11px]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {trigger.sources.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">推奨情報ソース</p>
                  <ul className="space-y-1">
                    {trigger.sources.map((source, i) => (
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

              {trigger.relatedEntities && trigger.relatedEntities.length > 0 && (
                <div>
                  <p className="font-semibold mb-0.5">関連エンティティ</p>
                  <div className="flex gap-1 flex-wrap">
                    {trigger.relatedEntities.map((id) => (
                      <Link
                        key={id}
                        href={`/entity/${id}`}
                        className="text-blue-600 hover:underline text-[11px]"
                      >
                        {id}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {trigger.notes && (
                <div>
                  <p className="font-semibold mb-0.5">備考</p>
                  <p className="text-muted-foreground">{trigger.notes}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}
