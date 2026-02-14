export type ImpactLevel = "high" | "medium" | "low";
export type BusinessArea = "recruitment" | "media" | "saas";
export type ViewMode = "card" | "table" | "layer";
export type SortMode = "default" | "impact" | "name" | "frequency";
export type EntityStatus = "confirmed" | "unconfirmed" | "research_needed";
export type MonitoringFrequency = "realtime" | "weekly" | "monthly" | "quarterly";

export interface Source {
  name: string;
  url: string;
  frequency: string;
}

export interface ImpactDetail {
  recruitment?: ImpactLevel | "none";
  media?: ImpactLevel | "none";
  saas?: ImpactLevel | "none";
}

export interface Entity {
  id: string;
  name: string;
  nameKana?: string;
  layer: 1 | 2 | 3 | 4 | 5;
  subCategory?: string;
  summary: string;
  impactLevel: ImpactLevel;
  affectedBusiness: (BusinessArea | "all")[];
  impactDetail?: ImpactDetail;
  monitoringReason: string;
  monitoringPoints: string[];
  recommendedFrequency: MonitoringFrequency;
  sources: Source[];
  officialUrl?: string;
  stockCode?: string;
  operator?: string;
  relatedEntities?: string[];
  notes?: string;
  status: EntityStatus;
  lastUpdated: string;
  addedBy?: string;
}

export interface LayerDefinition {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  icon: string;
}

export interface FilterState {
  layers: number[];
  subCategories: string[];
  impactLevels: ImpactLevel[];
  businesses: BusinessArea[];
  searchText: string;
}

export interface DashboardStats {
  total: number;
  filteredTotal: number;
  byLayer: Record<number, number>;
  highImpactCount: number;
  researchNeededCount: number;
}

export type DashboardAction =
  | { type: "TOGGLE_LAYER"; layer: number }
  | { type: "TOGGLE_SUBCATEGORY"; subCategory: string }
  | { type: "TOGGLE_IMPACT"; level: ImpactLevel }
  | { type: "TOGGLE_BUSINESS"; business: BusinessArea }
  | { type: "SET_SEARCH"; text: string }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SET_SORT"; sortBy: SortMode }
  | { type: "TOGGLE_EXPAND"; entityId: string }
  | { type: "CLEAR_FILTERS" };

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  relatedEntityIds: string[];
  category: "product" | "partnership" | "funding" | "policy" | "market" | "technology";
  summary: string;
  crawledAt?: string;   // ISO8601、クロール日時（自動取得の場合）
  isManual?: boolean;   // true = 手動登録（旧news.jsonのデータ）
}

export interface SupplyChainNode {
  entityId: string;
  level: number;
  role: string;
  children: string[];
  influenceType: "regulation" | "market" | "technology" | "competition";
  influenceDescription: string;
}

export interface ConnectionReason {
  from: string;
  to: string;
  reason: string;
}

export interface SupplyChain {
  id: string;
  title: string;
  description: string;
  overview: string;
  nodes: SupplyChainNode[];
  connectionReasons: ConnectionReason[];
}

export interface SupplyChainData {
  chains: SupplyChain[];
}

// Risk Scenario types (3172-style)
export type RiskSeverity = "critical" | "high" | "medium" | "low";
export type RiskCategory = "policy" | "competition" | "technology" | "market" | "natural_disaster" | "regulation";
export type RiskStatus = "active" | "monitoring" | "mitigated" | "hypothetical";

export interface RiskImpactKPI {
  label: string;
  value: string;
  unit: string;
}

export interface AffectedSupplyLine {
  entityId: string;
  riskType: string;
  severity: RiskSeverity;
  detail: string;
}

export interface RiskScenario {
  id: string;
  title: string;
  severity: RiskSeverity;
  category: RiskCategory;
  status: RiskStatus;
  date: string;
  summary: string;
  detail: string;
  impactKPIs: RiskImpactKPI[];
  affectedSupplyLines: AffectedSupplyLine[];
  affectedBusinesses: (BusinessArea | "all")[];
  relatedEntityIds: string[];
  mitigationActions: string[];
  isPreset: boolean;
}

export interface DashboardState {
  filters: FilterState;
  viewMode: ViewMode;
  sortBy: SortMode;
  expandedCards: string[];
}
