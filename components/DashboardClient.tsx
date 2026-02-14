"use client"

import { useReducer, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SummaryCards } from "./SummaryCards"
import { FilterSidebar } from "./FilterSidebar"
import { SearchBar } from "./SearchBar"
import { ViewToggle } from "./ViewToggle"
import { EntityCard } from "./EntityCard"
import { EntityTable } from "./EntityTable"
import { ImpactMatrix } from "./ImpactMatrix"
import { LayerBadge } from "./LayerBadge"
import type {
  Entity,
  LayerDefinition,
  DashboardState,
  DashboardAction,
  ViewMode,
  SortMode,
} from "@/lib/types"
import { filterEntities, sortEntities, computeStats } from "@/lib/filters"

const initialState: DashboardState = {
  filters: {
    layers: [],
    subCategories: [],
    impactLevels: [],
    businesses: [],
    searchText: "",
  },
  viewMode: "card",
  sortBy: "default",
  expandedCards: [],
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function reducer(
  state: DashboardState,
  action: DashboardAction
): DashboardState {
  switch (action.type) {
    case "TOGGLE_LAYER":
      return {
        ...state,
        filters: {
          ...state.filters,
          layers: toggleArrayItem(state.filters.layers, action.layer),
        },
      }
    case "TOGGLE_SUBCATEGORY":
      return {
        ...state,
        filters: {
          ...state.filters,
          subCategories: toggleArrayItem(
            state.filters.subCategories,
            action.subCategory
          ),
        },
      }
    case "TOGGLE_IMPACT":
      return {
        ...state,
        filters: {
          ...state.filters,
          impactLevels: toggleArrayItem(
            state.filters.impactLevels,
            action.level
          ),
        },
      }
    case "TOGGLE_BUSINESS":
      return {
        ...state,
        filters: {
          ...state.filters,
          businesses: toggleArrayItem(
            state.filters.businesses,
            action.business
          ),
        },
      }
    case "SET_SEARCH":
      return {
        ...state,
        filters: { ...state.filters, searchText: action.text },
      }
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode }
    case "SET_SORT":
      return { ...state, sortBy: action.sortBy }
    case "TOGGLE_EXPAND":
      return {
        ...state,
        expandedCards: toggleArrayItem(state.expandedCards, action.entityId),
      }
    case "CLEAR_FILTERS":
      return { ...state, filters: initialState.filters }
    default:
      return state
  }
}

interface DashboardClientProps {
  entities: Entity[]
  layers: LayerDefinition[]
}

export function DashboardClient({ entities, layers }: DashboardClientProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const filteredEntities = useMemo(
    () => sortEntities(filterEntities(entities, state.filters), state.sortBy),
    [entities, state.filters, state.sortBy]
  )

  const stats = useMemo(
    () => computeStats(filteredEntities, entities),
    [filteredEntities, entities]
  )

  const layerMap = useMemo(() => {
    const map: Record<number, LayerDefinition> = {}
    for (const l of layers) map[l.id] = l
    return map
  }, [layers])

  const handleSearchChange = useCallback(
    (text: string) => dispatch({ type: "SET_SEARCH", text }),
    []
  )

  const handleViewChange = useCallback(
    (mode: ViewMode) => dispatch({ type: "SET_VIEW_MODE", mode }),
    []
  )

  const handleSortChange = useCallback(
    (sortBy: SortMode) => dispatch({ type: "SET_SORT", sortBy }),
    []
  )

  const activeFilterCount =
    state.filters.layers.length +
    state.filters.subCategories.length +
    state.filters.impactLevels.length +
    state.filters.businesses.length +
    (state.filters.searchText ? 1 : 0)

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4">
      <SummaryCards stats={stats} layers={layers} />

      <div className="flex gap-6 mt-4">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-4">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <FilterSidebar
                filters={state.filters}
                dispatch={dispatch}
                entities={entities}
                layers={layers}
              />
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden h-8 text-xs relative"
                  >
                    フィルター
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-4">
                  <ScrollArea className="h-full">
                    <FilterSidebar
                      filters={state.filters}
                      dispatch={dispatch}
                      entities={entities}
                      layers={layers}
                    />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <SearchBar
                value={state.filters.searchText}
                onChange={handleSearchChange}
              />
            </div>
            <ViewToggle
              viewMode={state.viewMode}
              onViewChange={handleViewChange}
              sortBy={state.sortBy}
              onSortChange={handleSortChange}
            />
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {filteredEntities.length} 件表示
            {filteredEntities.length !== entities.length &&
              ` (全 ${entities.length} 件中)`}
          </p>

          {/* Card View */}
          {state.viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredEntities.map((entity) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  layer={layerMap[entity.layer]}
                  isExpanded={state.expandedCards.includes(entity.id)}
                  onToggleExpand={() =>
                    dispatch({ type: "TOGGLE_EXPAND", entityId: entity.id })
                  }
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {state.viewMode === "table" && (
            <EntityTable entities={filteredEntities} layers={layerMap} />
          )}

          {/* Layer View */}
          {state.viewMode === "layer" && (
            <div className="space-y-6">
              {layers.map((layer) => {
                const layerEntities = filteredEntities.filter(
                  (e) => e.layer === layer.id
                )
                if (layerEntities.length === 0) return null
                return (
                  <div key={layer.id}>
                    <div
                      className="flex items-center gap-2 mb-3 pb-2 border-b-2"
                      style={{ borderColor: layer.color }}
                    >
                      <span className="text-lg">{layer.icon}</span>
                      <LayerBadge layer={layer.id} name={layer.name} />
                      <span className="text-xs text-muted-foreground">
                        ({layerEntities.length}件)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {layerEntities.map((entity) => (
                        <EntityCard
                          key={entity.id}
                          entity={entity}
                          layer={layer}
                          isExpanded={state.expandedCards.includes(entity.id)}
                          onToggleExpand={() =>
                            dispatch({
                              type: "TOGGLE_EXPAND",
                              entityId: entity.id,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredEntities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">該当するエンティティがありません</p>
              <p className="text-sm">フィルター条件を変更してください</p>
            </div>
          )}

          {/* Impact Matrix */}
          <div className="mt-8">
            <ImpactMatrix entities={filteredEntities} layers={layers} />
          </div>
        </main>
      </div>
    </div>
  )
}
