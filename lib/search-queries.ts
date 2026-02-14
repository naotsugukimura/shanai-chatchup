/**
 * 検索クエリ定義
 * 34エンティティを8グループに分割し、曜日ローテーションで実行
 * Google Custom Search API 無料枠 100クエリ/日 の16%以下に抑える
 */

export interface SearchQueryGroup {
  id: string
  label: string
  queries: string[]
  targetEntityIds: string[]
  schedule: number[] // 実行する曜日 (0=日, 1=月, ..., 6=土)
}

export const QUERY_GROUPS: SearchQueryGroup[] = [
  // グループA: 政策・制度（L1系 5エンティティ）
  {
    id: "policy",
    label: "政策・制度",
    queries: [
      "障害福祉 報酬改定 OR 法定雇用率 OR 処遇改善加算 2026",
      "障害福祉 厚労省 OR こども家庭庁 OR デジタル庁 通知 制度変更",
    ],
    targetEntityIds: ["L1-001", "L1-002", "L1-003", "L1-004", "L1-005"],
    schedule: [1, 2, 3, 4, 5, 6], // 月〜土（毎日）
  },
  // グループB: 大手事業者（L2系 4エンティティ）
  {
    id: "large-operators",
    label: "大手事業者",
    queries: [
      "LITALICO OR ウェルビー OR ココルポート 障害福祉 就労支援",
      "AHCグループ 障害 OR 就労支援 OR M&A",
    ],
    targetEntityIds: ["L2-001", "L2-002", "L2-003", "L2-004"],
    schedule: [1, 3, 5], // 月水金
  },
  // グループC: 人材紹介競合（L3A系 6エンティティ）
  {
    id: "recruitment",
    label: "人材紹介",
    queries: [
      "atGP OR dodaチャレンジ OR 障害者雇用バンク 障害者 転職 求人",
      "クローバーナビ OR WEBサーナ OR リコモス 障害者 雇用 採用",
    ],
    targetEntityIds: ["L3A-001", "L3A-002", "L3A-003", "L3A-004", "L3A-005", "L3A-006"],
    schedule: [1, 3, 5], // 月水金
  },
  // グループD: メディア競合（L3B系 2エンティティ）
  {
    id: "media",
    label: "メディア",
    queries: [
      "LITALICO仕事ナビ OR 発達ナビ 障害 就労 メディア",
    ],
    targetEntityIds: ["L3B-001", "L3B-002"],
    schedule: [2, 4, 5], // 火木金
  },
  // グループE: SaaS競合（L3C系 7エンティティ）
  {
    id: "saas",
    label: "SaaS",
    queries: [
      "knowbe OR HUG OR ほのぼのmore 障害福祉 ソフト SaaS",
      "介舟ファミリー OR かんたん請求ソフト OR ケアコラボ 障害 請求 システム",
    ],
    targetEntityIds: ["L3C-001", "L3C-002", "L3C-003", "L3C-004", "L3C-005", "L3C-006"],
    schedule: [2, 4, 5], // 火木金
  },
  // グループF: 周辺プレイヤー（L4系）
  {
    id: "peripheral",
    label: "周辺プレイヤー",
    queries: [
      "Lean on Me OR Special Learning OR デコボコベース 障害福祉 研修 eラーニング",
    ],
    targetEntityIds: ["L4-001", "L4-002", "L4-003"],
    schedule: [2, 4], // 火木
  },
  // グループG: テック/参照企業（L5系 6エンティティ）
  {
    id: "tech",
    label: "テクノロジー",
    queries: [
      "LayerX バクラク OR freee 福祉 AI BPO",
      "リクルート OR パーソル 障害者雇用 DX テクノロジー",
    ],
    targetEntityIds: ["L5-001", "L5-002", "L5-003", "L5-004", "L5-005", "L5-006"],
    schedule: [2, 4, 5], // 火木金
  },
  // グループH: 業界横断ワード
  {
    id: "industry",
    label: "業界全般",
    queries: [
      "障害福祉サービス DX OR AI OR SaaS 新サービス 2026",
      "就労支援 テクノロジー OR 自動化 OR 生成AI 2026",
      "障害者雇用 法改正 OR 規制変更 OR 新制度 2026",
      "放課後等デイサービス OR 児童発達支援 制度 変更 2026",
    ],
    targetEntityIds: [],
    schedule: [1, 2, 3, 4, 5, 6], // 月〜土（毎日）
  },
]

/**
 * 今日の曜日に基づいて実行すべきクエリグループを返す
 */
export function getTodaysQueries(): SearchQueryGroup[] {
  const today = new Date().getDay() // 0=日, 1=月, ..., 6=土
  return QUERY_GROUPS.filter((group) => group.schedule.includes(today))
}

/**
 * 全クエリ数を計算（今日の分）
 */
export function getTodaysQueryCount(): number {
  return getTodaysQueries().reduce((sum, g) => sum + g.queries.length, 0)
}
