"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LayerBadge } from "./LayerBadge"
import { ImpactBadge } from "./ImpactBadge"
import { BusinessTag } from "./BusinessTag"
import type { Entity, LayerDefinition } from "@/lib/types"
import { getFrequencyLabel, getStatusLabel } from "@/lib/utils"

interface EntityTableProps {
  entities: Entity[]
  layers: Record<number, LayerDefinition>
}

export function EntityTable({ entities, layers }: EntityTableProps) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-[180px]">エンティティ名</TableHead>
            <TableHead className="text-xs w-[100px]">レイヤー</TableHead>
            <TableHead className="text-xs w-[130px]">サブカテゴリ</TableHead>
            <TableHead className="text-xs w-[60px]">影響度</TableHead>
            <TableHead className="text-xs w-[150px]">影響事業</TableHead>
            <TableHead className="text-xs w-[80px]">監視頻度</TableHead>
            <TableHead className="text-xs w-[70px]">状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={entity.id} className="hover:bg-muted/50">
              <TableCell className="text-xs font-medium py-2">
                <Link
                  href={`/entity/${entity.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {entity.name}
                </Link>
                {entity.operator && (
                  <span className="block text-[10px] text-muted-foreground">
                    {entity.operator}
                  </span>
                )}
              </TableCell>
              <TableCell className="py-2">
                <LayerBadge
                  layer={entity.layer}
                  name={layers[entity.layer]?.name}
                  size="sm"
                />
              </TableCell>
              <TableCell className="text-[11px] text-muted-foreground py-2">
                {entity.subCategory ?? "─"}
              </TableCell>
              <TableCell className="py-2">
                <ImpactBadge level={entity.impactLevel} size="sm" />
              </TableCell>
              <TableCell className="py-2">
                <div className="flex gap-0.5 flex-wrap">
                  {entity.affectedBusiness.map((b) => (
                    <BusinessTag key={b} business={b} />
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-[11px] py-2">
                {getFrequencyLabel(entity.recommendedFrequency)}
              </TableCell>
              <TableCell className="text-[11px] py-2">
                {entity.status === "research_needed" ? (
                  <span className="text-amber-600 font-medium">
                    {getStatusLabel(entity.status)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {getStatusLabel(entity.status)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
