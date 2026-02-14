"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import type {
  Entity,
  LayerDefinition,
  DashboardAction,
  FilterState,
} from "@/lib/types"
import { BUSINESS_AREAS, IMPACT_LEVELS } from "@/lib/constants"
import { getUniqueSubCategories } from "@/lib/filters"
import { getBusinessLabel, getImpactLabel } from "@/lib/utils"

interface FilterSidebarProps {
  filters: FilterState
  dispatch: React.Dispatch<DashboardAction>
  entities: Entity[]
  layers: LayerDefinition[]
}

export function FilterSidebar({
  filters,
  dispatch,
  entities,
  layers,
}: FilterSidebarProps) {
  const subCategories = getUniqueSubCategories(entities)
  const activeFilterCount =
    filters.layers.length +
    filters.subCategories.length +
    filters.impactLevels.length +
    filters.businesses.length +
    (filters.searchText ? 1 : 0)

  const impactLevels = IMPACT_LEVELS
  const businesses = BUSINESS_AREAS

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm">フィルター</h2>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => dispatch({ type: "CLEAR_FILTERS" })}
          >
            クリア ({activeFilterCount})
          </Button>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-xs font-semibold mb-2">レイヤー</p>
        <div className="space-y-1.5">
          {layers.map((layer) => (
            <label
              key={layer.id}
              className="flex items-center gap-2 cursor-pointer text-xs"
            >
              <Checkbox
                checked={filters.layers.includes(layer.id)}
                onCheckedChange={() =>
                  dispatch({ type: "TOGGLE_LAYER", layer: layer.id })
                }
              />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: layer.color }}
              />
              <span className="truncate">
                L{layer.id} {layer.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {subCategories.length > 0 && (
        <>
          <div>
            <p className="text-xs font-semibold mb-2">サブカテゴリ</p>
            <div className="space-y-1.5">
              {subCategories.map((sub) => (
                <label
                  key={sub}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={filters.subCategories.includes(sub)}
                    onCheckedChange={() =>
                      dispatch({ type: "TOGGLE_SUBCATEGORY", subCategory: sub })
                    }
                  />
                  <span className="truncate">{sub}</span>
                </label>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      <div>
        <p className="text-xs font-semibold mb-2">影響度</p>
        <div className="space-y-1.5">
          {impactLevels.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 cursor-pointer text-xs"
            >
              <Checkbox
                checked={filters.impactLevels.includes(level)}
                onCheckedChange={() =>
                  dispatch({ type: "TOGGLE_IMPACT", level })
                }
              />
              <span>{getImpactLabel(level)}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-xs font-semibold mb-2">影響事業</p>
        <div className="space-y-1.5">
          {businesses.map((biz) => (
            <label
              key={biz}
              className="flex items-center gap-2 cursor-pointer text-xs"
            >
              <Checkbox
                checked={filters.businesses.includes(biz)}
                onCheckedChange={() =>
                  dispatch({ type: "TOGGLE_BUSINESS", business: biz })
                }
              />
              <span>{getBusinessLabel(biz)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
