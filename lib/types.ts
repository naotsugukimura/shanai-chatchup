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

export interface DashboardState {
  filters: FilterState;
  viewMode: ViewMode;
  sortBy: SortMode;
  expandedCards: string[];
}
