"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import type { Entity, LayerDefinition, SupplyChainData, SupplyChainNode, ConnectionReason } from "@/lib/types"
import { INFLUENCE_COLORS, SUPPLY_CHAIN_LEVEL_LABELS, EDGE_TYPE_STYLES } from "@/lib/constants"
import { createIdMap, createNumericIdMap } from "@/lib/utils"

interface SupplyChainTreeProps {
  supplyChainData: SupplyChainData
  entities: Entity[]
  layers: LayerDefinition[]
}

interface NodePosition {
  x: number
  y: number
  width: number
  height: number
}

export function SupplyChainTree({
  supplyChainData,
  entities,
  layers,
}: SupplyChainTreeProps) {
  const [selectedChain, setSelectedChain] = useState(supplyChainData.chains[0]?.id ?? "")
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredConnection, setHoveredConnection] = useState<ConnectionReason | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [positions, setPositions] = useState<Record<string, NodePosition>>({})

  const entityMap = useMemo(() => createIdMap(entities), [entities])
  const layerMap = useMemo(() => createNumericIdMap(layers), [layers])

  const chain = supplyChainData.chains.find((c) => c.id === selectedChain)

  // Calculate node positions for SVG lines
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newPositions: Record<string, NodePosition> = {}

    for (const [entityId, el] of Object.entries(nodeRefs.current)) {
      if (el) {
        const rect = el.getBoundingClientRect()
        newPositions[entityId] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        }
      }
    }
    setPositions(newPositions)
  }, [])

  useEffect(() => {
    const timer = setTimeout(updatePositions, 100)
    window.addEventListener("resize", updatePositions)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updatePositions)
    }
  }, [selectedChain, updatePositions])

  // Build a map of connection reasons: "from->to" => reason
  const reasonMap = useMemo(() => {
    if (!chain) return {}
    const map: Record<string, ConnectionReason> = {}
    for (const cr of chain.connectionReasons ?? []) {
      map[`${cr.from}->${cr.to}`] = cr
    }
    return map
  }, [chain])

  if (!chain) return null

  // Group nodes by level
  const nodesByLevel = chain.nodes.reduce<Record<number, SupplyChainNode[]>>(
    (acc, node) => {
      if (!acc[node.level]) acc[node.level] = []
      acc[node.level].push(node)
      return acc
    },
    {}
  )

  const nodeMap = chain.nodes.reduce<Record<string, SupplyChainNode>>(
    (acc, node) => {
      acc[node.entityId] = node
      return acc
    },
    {}
  )

  const levels = Object.keys(nodesByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  // Generate connection lines with edgeType from connectionReasons
  const connections: { from: string; to: string; type: string; edgeType: string }[] = []
  for (const node of chain.nodes) {
    for (const childId of node.children) {
      const cr = reasonMap[`${node.entityId}->${childId}`]
      connections.push({
        from: node.entityId,
        to: childId,
        type: node.influenceType,
        edgeType: cr?.edgeType ?? "dependency",
      })
    }
  }

  // Get highlight path for selected node
  const getHighlightedNodes = (nodeId: string): Set<string> => {
    const highlighted = new Set<string>()
    // Upstream
    const findUpstream = (id: string) => {
      highlighted.add(id)
      for (const n of chain.nodes) {
        if (n.children.includes(id) && !highlighted.has(n.entityId)) {
          findUpstream(n.entityId)
        }
      }
    }
    // Downstream
    const findDownstream = (id: string) => {
      highlighted.add(id)
      const node = nodeMap[id]
      if (node) {
        for (const childId of node.children) {
          if (!highlighted.has(childId)) findDownstream(childId)
        }
      }
    }
    findUpstream(nodeId)
    findDownstream(nodeId)
    return highlighted
  }

  const highlightedNodes = selectedNode ? getHighlightedNodes(selectedNode) : null

  return (
    <div className="space-y-4">
      {/* Chain Selector */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground shrink-0">連鎖を選択:</span>
        <div className="flex gap-2 flex-wrap">
          {supplyChainData.chains.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedChain(c.id); setSelectedNode(null) }}
              className={`text-left border rounded-lg px-3 py-2 transition-all text-xs ${
                selectedChain === c.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary font-bold"
                  : "hover:border-foreground/30"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Description + Overview */}
      <div className="space-y-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{chain.description}</p>
          </div>
          {(selectedNode || hoveredConnection) && (
            <button
              onClick={() => { setSelectedNode(null); setHoveredConnection(null) }}
              className="text-[10px] px-2 py-1 rounded border hover:bg-muted transition-colors shrink-0"
            >
              選択解除
            </button>
          )}
        </div>
        {chain.overview && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">💡</span>
              <div>
                <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 mb-1">この連鎖の全体像</p>
                <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">{chain.overview}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tree Visualization - 3171 style */}
      <div
        ref={containerRef}
        className="relative bg-muted/20 rounded-xl border p-6 overflow-x-auto min-h-[400px]"
      >
        {/* SVG Connection Lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        >
          {connections.map(({ from, to, type, edgeType }) => {
            const fromPos = positions[from]
            const toPos = positions[to]
            if (!fromPos || !toPos) return null

            const isHighlighted =
              highlightedNodes &&
              highlightedNodes.has(from) &&
              highlightedNodes.has(to)
            const isDimmed = highlightedNodes && !isHighlighted
            const isHoveredLine =
              hoveredConnection?.from === from && hoveredConnection?.to === to
            const edgeStyle = EDGE_TYPE_STYLES[edgeType]
            const influenceColor = INFLUENCE_COLORS[type]?.color ?? "#94a3b8"
            const color = edgeStyle?.color ?? influenceColor
            const hasReason = !!reasonMap[`${from}->${to}`]

            // Calculate bezier curve points
            const startX = fromPos.x
            const startY = fromPos.y + fromPos.height / 2
            const endX = toPos.x
            const endY = toPos.y - toPos.height / 2
            const midY = (startY + endY) / 2

            // Edge type specific dash patterns
            const baseDash = edgeStyle?.dashArray ?? "none"
            const dashArray = isDimmed ? "4 4" : baseDash

            // Bottleneck edges are thicker
            const baseWidth = edgeType === "bottleneck" ? 3 : 1.5

            return (
              <g key={`${from}-${to}`}>
                {/* Invisible wider path for click area */}
                {hasReason && (
                  <path
                    d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-pointer"
                    onClick={() => setHoveredConnection(reasonMap[`${from}->${to}`])}
                  />
                )}
                {/* Visible path */}
                <path
                  d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={isDimmed ? "#e2e8f0" : isHoveredLine ? "#f59e0b" : color}
                  strokeWidth={isHoveredLine ? 3.5 : isHighlighted ? baseWidth + 1 : baseWidth}
                  strokeDasharray={dashArray}
                  opacity={isDimmed ? 0.3 : 0.7}
                  className={hasReason ? "pointer-events-none" : ""}
                />
                {/* Arrow at end */}
                <circle
                  cx={endX}
                  cy={endY}
                  r={isHoveredLine ? 4 : isHighlighted ? 3.5 : 2.5}
                  fill={isDimmed ? "#e2e8f0" : isHoveredLine ? "#f59e0b" : color}
                  opacity={isDimmed ? 0.3 : 0.8}
                />
                {/* Edge type label on the line */}
                {hasReason && !isDimmed && edgeType !== "dependency" && (
                  <g>
                    <rect
                      x={(startX + endX) / 2 - 16}
                      y={midY - 7}
                      width={32}
                      height={14}
                      rx={3}
                      fill={isHoveredLine ? "#f59e0b" : color}
                      opacity={0.9}
                    />
                    <text
                      x={(startX + endX) / 2}
                      y={midY + 3}
                      textAnchor="middle"
                      fill="white"
                      fontSize={8}
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {edgeStyle?.label ?? ""}
                    </text>
                  </g>
                )}
                {/* Default reason indicator for dependency edges */}
                {hasReason && !isDimmed && edgeType === "dependency" && (
                  <circle
                    cx={(startX + endX) / 2}
                    cy={midY}
                    r={isHoveredLine ? 6 : 4}
                    fill={isHoveredLine ? "#f59e0b" : color}
                    opacity={0.9}
                    className="cursor-pointer pointer-events-none"
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Nodes by level */}
        <div className="relative space-y-8" style={{ zIndex: 1 }}>
          {levels.map((level) => {
            const nodes = nodesByLevel[level]
            return (
              <div key={level}>
                {/* Level Label */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: level === 0 ? "#DC2626" : level === 1 ? "#2563EB" : level === 2 ? "#059669" : "#7C3AED" }}
                  >
                    {SUPPLY_CHAIN_LEVEL_LABELS[level] ?? `Lv.${level}`}
                  </span>
                </div>

                {/* Node Cards */}
                <div className="flex gap-4 flex-wrap justify-start pl-4">
                  {nodes.map((node) => {
                    const entity = entityMap[node.entityId]
                    const layer = entity ? layerMap[entity.layer] : null
                    const influence = INFLUENCE_COLORS[node.influenceType]
                    const isSelected = selectedNode === node.entityId
                    const isDimmed =
                      highlightedNodes && !highlightedNodes.has(node.entityId)

                    return (
                      <div
                        key={node.entityId}
                        ref={(el) => { nodeRefs.current[node.entityId] = el }}
                        onClick={() =>
                          setSelectedNode(
                            selectedNode === node.entityId ? null : node.entityId
                          )
                        }
                        className={`
                          bg-background border rounded-lg p-3 cursor-pointer
                          transition-all duration-200 min-w-[180px] max-w-[220px]
                          ${isSelected ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"}
                          ${isDimmed ? "opacity-25" : ""}
                        `}
                        style={{
                          borderTopWidth: "3px",
                          borderTopColor: layer?.color ?? "#6b7280",
                        }}
                      >
                        {/* Icon + Name */}
                        <div className="flex items-start gap-2 mb-1.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5"
                            style={{ backgroundColor: layer?.color ?? "#6b7280" }}
                          >
                            {layer?.icon ?? "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[11px] leading-tight truncate">
                              {entity?.name ?? node.entityId}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {node.role}
                            </p>
                          </div>
                        </div>

                        {/* Influence badge + special indicators */}
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                          {influence && (
                            <span
                              className="text-[8px] px-1 py-0 rounded text-white"
                              style={{ backgroundColor: influence.color }}
                            >
                              {influence.label}
                            </span>
                          )}
                          {layer && (
                            <Badge
                              className="text-[8px] px-1 py-0 shrink-0 text-white border-0"
                              style={{ backgroundColor: layer.color }}
                            >
                              L{layer.id}
                            </Badge>
                          )}
                          {node.bottleneck && (
                            <span className="text-[8px] px-1 py-0 rounded bg-red-600 text-white font-bold">
                              BOTTLENECK
                            </span>
                          )}
                          {node.subType && (
                            <span className="text-[8px] px-1 py-0 rounded bg-slate-600 text-white">
                              {node.subType === "back-office" ? "事務系" : node.subType === "service-quality" ? "教育系" : node.subType}
                            </span>
                          )}
                        </div>

                        {/* Influence description */}
                        <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {node.influenceDescription}
                        </p>

                        {/* Override Rules indicator */}
                        {node.overrideRules && (
                          <div className="mt-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-[8px] text-amber-800 dark:text-amber-200">
                            ⚠ {node.overrideRules}
                          </div>
                        )}

                        {/* Children indicator */}
                        {node.children.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-dashed">
                            <span className="text-[8px] text-muted-foreground">
                              ↓ {node.children.length} 先に波及
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Connection Reason Panel (when a line is clicked) */}
      {hoveredConnection && (
        <div className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-lg shrink-0">🔗</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold">なぜつながっているか？</span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded font-semibold">
                  {entityMap[hoveredConnection.from]?.name ?? hoveredConnection.from}
                </span>
                <span className="text-[10px] text-muted-foreground">→</span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded font-semibold">
                  {entityMap[hoveredConnection.to]?.name ?? hoveredConnection.to}
                </span>
                {hoveredConnection.edgeType && hoveredConnection.edgeType !== "dependency" && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold"
                    style={{ backgroundColor: EDGE_TYPE_STYLES[hoveredConnection.edgeType]?.color ?? "#6B7280" }}
                  >
                    {EDGE_TYPE_STYLES[hoveredConnection.edgeType]?.label ?? hoveredConnection.edgeType}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
                {hoveredConnection.reason}
              </p>
            </div>
            <button
              onClick={() => setHoveredConnection(null)}
              className="text-amber-400 hover:text-amber-600 text-sm shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Selected Node Detail + Related Connection Reasons */}
      {selectedNode && entityMap[selectedNode] && (
        <div className="space-y-3">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm">
                {entityMap[selectedNode].name}
              </span>
              <Badge className="text-[9px]">
                L{entityMap[selectedNode].layer}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {entityMap[selectedNode].summary}
            </p>
            <div className="flex gap-4 text-xs flex-wrap">
              <div>
                <span className="font-semibold">上流: </span>
                <span className="text-muted-foreground">
                  {chain.nodes
                    .filter((n) => n.children.includes(selectedNode))
                    .map((n) => entityMap[n.entityId]?.name ?? n.entityId)
                    .join(", ") || "なし（起点）"}
                </span>
              </div>
              <div>
                <span className="font-semibold">下流: </span>
                <span className="text-muted-foreground">
                  {nodeMap[selectedNode]?.children
                    .map((id) => entityMap[id]?.name ?? id)
                    .join(", ") || "なし（末端）"}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <a
                href={`/entity/${selectedNode}`}
                className="text-xs text-blue-600 hover:underline"
              >
                詳細ページを開く →
              </a>
            </div>
          </div>

          {/* Connection reasons related to the selected node */}
          {(() => {
            const relatedReasons = (chain.connectionReasons ?? []).filter(
              (cr) => cr.from === selectedNode || cr.to === selectedNode
            )
            if (relatedReasons.length === 0) return null
            return (
              <div className="border rounded-lg p-4 bg-muted/10">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>このノードの接続理由（{relatedReasons.length}件）</span>
                </h4>
                <div className="space-y-2">
                  {relatedReasons.map((cr, i) => {
                    const fromName = entityMap[cr.from]?.name ?? cr.from
                    const toName = entityMap[cr.to]?.name ?? cr.to
                    const isOutgoing = cr.from === selectedNode
                    return (
                      <div
                        key={i}
                        className="border rounded-md p-2.5 bg-background hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-semibold">
                            {isOutgoing ? "↓ 下流へ" : "↑ 上流から"}
                          </span>
                          <span className="text-[10px] font-bold">
                            {fromName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <span className="text-[10px] font-bold">
                            {toName}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {cr.reason}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground">
          <span className="font-semibold">影響タイプ:</span>
          {Object.entries(INFLUENCE_COLORS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: val.color }}
              />
              <span>{val.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground">
          <span className="font-semibold">関係性:</span>
          {Object.entries(EDGE_TYPE_STYLES).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1">
              <svg width="16" height="8">
                <line
                  x1="0" y1="4" x2="16" y2="4"
                  stroke={val.color}
                  strokeWidth={key === "bottleneck" ? 3 : 1.5}
                  strokeDasharray={val.dashArray ?? "none"}
                />
              </svg>
              <span>{val.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">※ ノードをクリックで影響経路をハイライト / 接続線をクリックで「なぜつながっているか」を表示</p>
      </div>
    </div>
  )
}
