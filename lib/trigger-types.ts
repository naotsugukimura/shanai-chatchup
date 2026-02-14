import type { ImpactLevel, BusinessArea } from "./types"

export type TriggerCategory =
  | "policy_change"      // 政策・制度変更
  | "market_entry"       // 新規参入・異業種参入
  | "ma"                 // M&A・業界再編
  | "technology"         // 技術トレンド
  | "market_shift"       // 市場構造変化
  | "regulatory"         // 規制・法改正

export type TriggerStatus = "active" | "upcoming" | "monitoring" | "resolved"

export interface Trigger {
  id: string
  title: string
  category: TriggerCategory
  summary: string
  impactLevel: ImpactLevel
  affectedBusiness: (BusinessArea | "all")[]
  keywords: string[]
  timeframe?: string
  monitoringReason: string
  monitoringPoints: string[]
  relatedEntities?: string[]
  sources: {
    name: string
    url: string
    frequency: string
  }[]
  status: TriggerStatus
  expectedDate?: string
  lastUpdated: string
  addedBy?: string
  notes?: string
}

export interface TriggerCategoryDefinition {
  id: TriggerCategory
  name: string
  icon: string
  color: string
}

export const TRIGGER_CATEGORIES: TriggerCategoryDefinition[] = [
  { id: "policy_change", name: "政策・制度変更", icon: "📋", color: "#DC2626" },
  { id: "market_entry", name: "新規参入・異業種参入", icon: "🚀", color: "#2563EB" },
  { id: "ma", name: "M&A・業界再編", icon: "🤝", color: "#D97706" },
  { id: "technology", name: "技術トレンド", icon: "💡", color: "#7C3AED" },
  { id: "market_shift", name: "市場構造変化", icon: "📊", color: "#059669" },
  { id: "regulatory", name: "規制・法改正", icon: "⚖️", color: "#DB2777" },
]
