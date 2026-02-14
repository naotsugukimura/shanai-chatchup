import type {
  Entity,
  FilterState,
  SortMode,
  DashboardStats,
  ImpactLevel,
} from "./types"
import { getFrequencyOrder } from "./utils"

const IMPACT_ORDER: Record<ImpactLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function filterEntities(
  entities: Entity[],
  filters: FilterState
): Entity[] {
  return entities.filter((entity) => {
    if (
      filters.layers.length > 0 &&
      !filters.layers.includes(entity.layer)
    ) {
      return false
    }

    if (filters.subCategories.length > 0) {
      if (
        !entity.subCategory ||
        !filters.subCategories.includes(entity.subCategory)
      ) {
        return false
      }
    }

    if (
      filters.impactLevels.length > 0 &&
      !filters.impactLevels.includes(entity.impactLevel)
    ) {
      return false
    }

    if (filters.businesses.length > 0) {
      const entityBusinesses = entity.affectedBusiness
      const hasMatch = filters.businesses.some(
        (b) => entityBusinesses.includes(b) || entityBusinesses.includes("all")
      )
      if (!hasMatch) return false
    }

    if (filters.searchText) {
      const q = filters.searchText.toLowerCase()
      const searchable = [
        entity.name,
        entity.nameKana,
        entity.summary,
        entity.subCategory,
        entity.operator,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!searchable.includes(q)) return false
    }

    return true
  })
}

export function sortEntities(
  entities: Entity[],
  sortBy: SortMode
): Entity[] {
  const sorted = [...entities]
  switch (sortBy) {
    case "default":
      return sorted.sort(
        (a, b) =>
          a.layer - b.layer ||
          IMPACT_ORDER[a.impactLevel] - IMPACT_ORDER[b.impactLevel]
      )
    case "impact":
      return sorted.sort(
        (a, b) =>
          IMPACT_ORDER[a.impactLevel] - IMPACT_ORDER[b.impactLevel]
      )
    case "name":
      return sorted.sort((a, b) =>
        (a.nameKana ?? a.name).localeCompare(b.nameKana ?? b.name, "ja")
      )
    case "frequency":
      return sorted.sort(
        (a, b) =>
          getFrequencyOrder(a.recommendedFrequency) -
          getFrequencyOrder(b.recommendedFrequency)
      )
    default:
      return sorted
  }
}

export function computeStats(
  filteredEntities: Entity[],
  allEntities: Entity[]
): DashboardStats {
  const byLayer: Record<number, number> = {}
  for (let i = 1; i <= 5; i++) {
    byLayer[i] = filteredEntities.filter((e) => e.layer === i).length
  }

  return {
    total: allEntities.length,
    filteredTotal: filteredEntities.length,
    byLayer,
    highImpactCount: filteredEntities.filter(
      (e) => e.impactLevel === "high"
    ).length,
    researchNeededCount: filteredEntities.filter(
      (e) => e.status === "research_needed"
    ).length,
  }
}

export function getUniqueSubCategories(entities: Entity[]): string[] {
  const subs = new Set<string>()
  for (const e of entities) {
    if (e.subCategory) subs.add(e.subCategory)
  }
  return Array.from(subs).sort()
}
