import type { BusinessArea, ImpactLevel } from "./types"

export const BUSINESS_AREAS: readonly BusinessArea[] = [
  "recruitment",
  "media",
  "saas",
] as const

export const BUSINESS_AREA_ENTRIES: readonly {
  key: BusinessArea
  label: string
}[] = [
  { key: "recruitment", label: "人材紹介" },
  { key: "media", label: "メディア" },
  { key: "saas", label: "SaaS" },
] as const

export const IMPACT_LEVELS: readonly ImpactLevel[] = [
  "high",
  "medium",
  "low",
] as const

export const NEWS_CATEGORIES: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  product: { label: "プロダクト", color: "#3B82F6", icon: "📦" },
  partnership: { label: "提携", color: "#8B5CF6", icon: "🤝" },
  funding: { label: "資金/M&A", color: "#EF4444", icon: "💰" },
  policy: { label: "政策", color: "#DC2626", icon: "🏛️" },
  market: { label: "市場動向", color: "#F59E0B", icon: "📈" },
  technology: { label: "技術", color: "#10B981", icon: "🔬" },
}

export const INFLUENCE_COLORS: Record<
  string,
  { color: string; label: string }
> = {
  regulation: { color: "#DC2626", label: "規制" },
  market: { color: "#F59E0B", label: "市場" },
  technology: { color: "#7C3AED", label: "技術" },
  competition: { color: "#2563EB", label: "競合" },
}

export const SUPPLY_CHAIN_LEVEL_LABELS = [
  "制度/基盤",
  "事業者/企業",
  "SaaS/ソフトウェア",
  "テクノロジー",
]

export const TRIGGER_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  active: { label: "進行中", color: "bg-red-500 text-white" },
  upcoming: { label: "予定", color: "bg-amber-500 text-white" },
  monitoring: { label: "監視中", color: "bg-blue-500 text-white" },
  resolved: { label: "解決済み", color: "bg-gray-400 text-white" },
}
