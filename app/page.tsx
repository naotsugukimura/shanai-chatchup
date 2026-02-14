import entitiesData from "@/data/entities.json"
import layersData from "@/data/layers.json"
import triggersData from "@/data/triggers.json"
import newsData from "@/data/news.json"
import supplyChainData from "@/data/supply-chain.json"
import riskScenariosData from "@/data/risk-scenarios.json"
import { Header } from "@/components/Header"
import { DashboardClient } from "@/components/DashboardClient"
import type { Entity, LayerDefinition, NewsItem, SupplyChainData, RiskScenario } from "@/lib/types"
import type { Trigger } from "@/lib/trigger-types"

export default function Home() {
  const entities = entitiesData as unknown as Entity[]
  const layers = layersData as unknown as LayerDefinition[]
  const triggers = triggersData as unknown as Trigger[]
  const news = newsData as unknown as NewsItem[]
  const supplyChain = supplyChainData as unknown as SupplyChainData
  const riskScenarios = riskScenariosData as unknown as RiskScenario[]

  return (
    <>
      <Header />
      <DashboardClient
        entities={entities}
        layers={layers}
        triggers={triggers}
        news={news}
        supplyChainData={supplyChain}
        riskScenarios={riskScenarios}
      />
    </>
  )
}
