import type { BusinessArea, ImpactLevel, NewsImpact } from "./types"

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

export const NEWS_IMPACT_CONFIG: Record<
  NewsImpact,
  { label: string; color: string; bgColor: string }
> = {
  high: { label: "重要", color: "#DC2626", bgColor: "bg-red-50 text-red-700 border-red-200" },
  medium: { label: "注目", color: "#F59E0B", bgColor: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "参考", color: "#6B7280", bgColor: "bg-gray-50 text-gray-600 border-gray-200" },
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
  "中間機関/ゲートキーパー",
  "事業者/企業",
  "SaaS/ソフトウェア",
  "テクノロジー/サービス",
]

export const EDGE_TYPE_STYLES: Record<
  string,
  { color: string; label: string; dashArray?: string }
> = {
  dependency: { color: "#6B7280", label: "依存" },
  cooperation: { color: "#10B981", label: "協力" },
  competition: { color: "#EF4444", label: "競合", dashArray: "6 3" },
  direct: { color: "#F59E0B", label: "直接", dashArray: "8 4" },
  bottleneck: { color: "#DC2626", label: "ボトルネック" },
}

export const TRIGGER_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  active: { label: "進行中", color: "bg-red-500 text-white" },
  upcoming: { label: "予定", color: "bg-amber-500 text-white" },
  monitoring: { label: "監視中", color: "bg-blue-500 text-white" },
  resolved: { label: "解決済み", color: "bg-gray-400 text-white" },
}
