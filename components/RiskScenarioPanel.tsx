"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { RiskScenario, Entity } from "@/lib/types"
import { createIdMap } from "@/lib/utils"

interface RiskScenarioPanelProps {
  scenarios: RiskScenario[]
  entities: Entity[]
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: "緊急", color: "#DC2626", bgColor: "bg-red-50 border-red-200" },
  high: { label: "高", color: "#EA580C", bgColor: "bg-orange-50 border-orange-200" },
  medium: { label: "中", color: "#D97706", bgColor: "bg-amber-50 border-amber-200" },
  low: { label: "低", color: "#059669", bgColor: "bg-green-50 border-green-200" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-red-500" },
  monitoring: { label: "監視中", color: "bg-blue-500" },
  mitigated: { label: "緩和済", color: "bg-green-500" },
  hypothetical: { label: "仮説", color: "bg-purple-500" },
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  policy: { label: "政策変更", icon: "🏛️" },
  competition: { label: "競合動向", icon: "⚔️" },
  technology: { label: "技術変化", icon: "🔬" },
  market: { label: "市場変動", icon: "📈" },
  natural_disaster: { label: "自然災害", icon: "🌊" },
  regulation: { label: "法規制", icon: "📋" },
}

export function RiskScenarioPanel({ scenarios, entities }: RiskScenarioPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(scenarios[0]?.id ?? null)
  const [tab, setTab] = useState<string>("preset")

  const entityMap = useMemo(() => createIdMap(entities), [entities])

  const presetScenarios = scenarios.filter((s) => s.isPreset)
  const customScenarios = scenarios.filter((s) => !s.isPreset)

  const selected = scenarios.find((s) => s.id === selectedId)
  const severity = selected ? SEVERITY_CONFIG[selected.severity] : null
  const status = selected ? STATUS_CONFIG[selected.status] : null
  const category = selected ? CATEGORY_CONFIG[selected.category] : null

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">総シナリオ数</p>
          <p className="text-2xl font-bold">{scenarios.length}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">緊急</p>
          <p className="text-2xl font-bold text-red-600">
            {scenarios.filter((s) => s.severity === "critical").length}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">進行中</p>
          <p className="text-2xl font-bold text-red-500">
            {scenarios.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">監視中</p>
          <p className="text-2xl font-bold text-blue-500">
            {scenarios.filter((s) => s.status === "monitoring").length}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">影響エンティティ</p>
          <p className="text-2xl font-bold">
            {new Set(scenarios.flatMap((s) => s.relatedEntityIds)).size}
          </p>
        </div>
      </div>

      {/* Main Layout: Left scenario list + Right detail panel */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Left: Scenario Cards */}
        <div className="lg:w-[380px] shrink-0 space-y-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="preset" className="flex-1 text-xs">
                推定リスクシナリオ ({presetScenarios.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 text-xs">
                マイシナリオ ({customScenarios.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-2">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {presetScenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedId === scenario.id}
                    onClick={() => setSelectedId(scenario.id)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {customScenarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p className="text-sm mb-2">マイシナリオはまだありません</p>
                    <p className="text-[10px]">独自のリスクシナリオを追加できます</p>
                  </div>
                ) : (
                  customScenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      isSelected={selectedId === scenario.id}
                      onClick={() => setSelectedId(scenario.id)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Detail Panel */}
        {selected ? (
          <div className="flex-1 min-w-0 space-y-4">
            {/* Title + Severity */}
            <div className="flex items-start gap-3">
              <div
                className="w-1.5 h-full self-stretch rounded-full shrink-0"
                style={{ backgroundColor: severity?.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: severity?.color }}
                  >
                    {severity?.label}
                  </span>
                  <span
                    className={`text-[10px] text-white px-2 py-0.5 rounded ${status?.color}`}
                  >
                    {status?.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {category?.icon} {category?.label}
                  </span>
                  {selected.date && (
                    <span className="text-[10px] text-muted-foreground">
                      {selected.date}
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-base">{selected.title}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {selected.summary}
                </p>
              </div>
            </div>

            {/* 1. Impact Analysis (KPIs) */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">1. インパクト分析</h3>
                <div className="grid grid-cols-3 gap-3">
                  {selected.impactKPIs.map((kpi, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {kpi.label}
                      </p>
                      <p className="text-lg font-bold">
                        {kpi.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {kpi.unit}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2. Affected Supply Lines */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">
                  2. 供給ラインと影響のリスク
                </h3>
                <div className="space-y-2">
                  {selected.affectedSupplyLines.map((line, i) => {
                    const entity = entityMap[line.entityId]
                    const lineSeverity = SEVERITY_CONFIG[line.severity]
                    return (
                      <div
                        key={i}
                        className={`border rounded-lg p-3 ${lineSeverity?.bgColor ?? ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/entity/${line.entityId}`}
                              className="font-bold text-xs hover:text-blue-600 hover:underline"
                            >
                              {entity?.name ?? line.entityId}
                            </a>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: lineSeverity?.color }}
                            >
                              {lineSeverity?.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {line.riskType}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {line.detail}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3. Detail */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-2">3. 詳細分析</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selected.detail}
                </p>
              </CardContent>
            </Card>

            {/* 4. Mitigation Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-2">4. 対策アクション</h3>
                <ul className="space-y-1.5">
                  {selected.mitigationActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0 mt-0.5">
                        {i + 1}.
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 5. Related Entities */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">関連エンティティ:</span>
              {selected.relatedEntityIds.map((id) => {
                const entity = entityMap[id]
                return entity ? (
                  <a
                    key={id}
                    href={`/entity/${id}`}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 text-blue-600"
                  >
                    {entity.name}
                  </a>
                ) : null
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">左のリスクシナリオを選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component: Scenario Card
function ScenarioCard({
  scenario,
  isSelected,
  onClick,
}: {
  scenario: RiskScenario
  isSelected: boolean
  onClick: () => void
}) {
  const severity = SEVERITY_CONFIG[scenario.severity]
  const status = STATUS_CONFIG[scenario.status]
  const category = CATEGORY_CONFIG[scenario.category]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-lg p-3 transition-all ${
        isSelected
          ? "ring-2 ring-primary bg-primary/5 border-primary"
          : "hover:border-foreground/30 hover:shadow-sm"
      }`}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: severity?.color ?? "#6b7280",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span
          className="text-[9px] font-bold text-white px-1.5 py-0 rounded"
          style={{ backgroundColor: severity?.color }}
        >
          {severity?.label}
        </span>
        <span className={`text-[9px] text-white px-1.5 py-0 rounded ${status?.color}`}>
          {status?.label}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {category?.icon} {category?.label}
        </span>
      </div>
      <p className="font-bold text-xs mb-1 leading-tight">{scenario.title}</p>
      <p className="text-[10px] text-muted-foreground line-clamp-2">
        {scenario.summary}
      </p>
      {scenario.date && (
        <p className="text-[9px] text-muted-foreground mt-1">{scenario.date}</p>
      )}
    </button>
  )
}
