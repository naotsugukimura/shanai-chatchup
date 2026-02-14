"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { LayerBadge } from "@/components/LayerBadge"
import { ImpactBadge } from "@/components/ImpactBadge"
import { BusinessTag } from "@/components/BusinessTag"
import type { Entity, LayerDefinition } from "@/lib/types"
import {
  getFrequencyLabel,
  getStatusLabel,
  getImpactIcon,
} from "@/lib/utils"

interface EntityDetailClientProps {
  entity: Entity
  layer?: LayerDefinition
  relatedEntities: Entity[]
}

export function EntityDetailClient({
  entity,
  layer,
  relatedEntities,
}: EntityDetailClientProps) {
  const businesses = [
    { key: "recruitment" as const, label: "人材紹介" },
    { key: "media" as const, label: "メディア" },
    { key: "saas" as const, label: "SaaS" },
  ]

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <LayerBadge layer={entity.layer} name={layer?.name} />
          <ImpactBadge level={entity.impactLevel} />
          {entity.status === "research_needed" && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
              要調査
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-1">{entity.name}</h1>
        {entity.operator && (
          <p className="text-sm text-muted-foreground">
            運営: {entity.operator}
          </p>
        )}
        {entity.stockCode && (
          <p className="text-sm text-muted-foreground">
            証券コード: {entity.stockCode}
          </p>
        )}
        {entity.subCategory && (
          <p className="text-sm text-muted-foreground">
            カテゴリ: {entity.subCategory}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {entity.affectedBusiness.map((b) => (
            <BusinessTag key={b} business={b} />
          ))}
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold text-sm mb-2">概要</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {entity.summary}
          </p>
        </CardContent>
      </Card>

      {/* Impact Detail */}
      {entity.impactDetail && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-3">事業別影響度</h2>
            <div className="grid grid-cols-3 gap-4">
              {businesses.map((biz) => {
                const level = entity.impactDetail?.[biz.key]
                return (
                  <div key={biz.key} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {biz.label}
                    </p>
                    <p className="text-2xl">
                      {getImpactIcon(level ?? "none")}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Reason */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold text-sm mb-2">監視理由</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {entity.monitoringReason}
          </p>
        </CardContent>
      </Card>

      {/* Monitoring Points */}
      {entity.monitoringPoints.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-2">監視ポイント</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {entity.monitoringPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">推奨監視頻度</p>
            <p className="font-bold">
              {getFrequencyLabel(entity.recommendedFrequency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">ステータス</p>
            <p className="font-bold">{getStatusLabel(entity.status)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">最終更新</p>
            <p className="font-bold">{entity.lastUpdated}</p>
            {entity.addedBy && (
              <p className="text-xs text-muted-foreground">
                追加者: {entity.addedBy}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources */}
      {entity.sources.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-3">推奨情報ソース</h2>
            <div className="space-y-2">
              {entity.sources.map((source, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {source.name}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {source.frequency}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Official URL */}
      {entity.officialUrl && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-2">公式サイト</h2>
            <a
              href={entity.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {entity.officialUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Related Entities */}
      {relatedEntities.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-3">関連エンティティ</h2>
            <div className="space-y-2">
              {relatedEntities.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/entity/${rel.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <LayerBadge layer={rel.layer} size="sm" />
                  {rel.name}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {entity.notes && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-2">備考</h2>
            <p className="text-sm text-muted-foreground">{entity.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
