"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Entity, LayerDefinition } from "@/lib/types"
import { BUSINESS_AREA_ENTRIES } from "@/lib/constants"
import { getImpactIcon, getImpactDotColor } from "@/lib/utils"

interface ImpactMatrixProps {
  entities: Entity[]
  layers: LayerDefinition[]
}

export function ImpactMatrix({ entities, layers }: ImpactMatrixProps) {
  const businesses = BUSINESS_AREA_ENTRIES

  return (
    <div>
      <h2 className="font-bold text-sm mb-3">
        影響マッピングマトリクス
      </h2>
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-semibold min-w-[200px]">
                エンティティ
              </th>
              {businesses.map((biz) => (
                <th
                  key={biz.key}
                  className="text-center p-2 font-semibold w-[100px]"
                >
                  {biz.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => {
              const layerEntities = entities.filter(
                (e) => e.layer === layer.id
              )
              if (layerEntities.length === 0) return null
              return (
                <tbody key={layer.id}>
                  <tr>
                    <td
                      colSpan={4}
                      className="p-1.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: layer.color }}
                    >
                      {layer.icon} L{layer.id} {layer.name}
                    </td>
                  </tr>
                  {layerEntities.map((entity) => (
                    <tr key={entity.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{entity.name}</td>
                      {businesses.map((biz) => {
                        const level = entity.impactDetail?.[biz.key]
                        const dotColor = getImpactDotColor(level)
                        return (
                          <td key={biz.key} className="text-center p-2">
                            {level && level !== "none" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-block w-4 h-4 rounded-full ${dotColor} cursor-default`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {entity.name} × {biz.label}:{" "}
                                    {getImpactIcon(level)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">─</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
