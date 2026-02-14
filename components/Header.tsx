export function Header() {
  return (
    <header className="bg-header text-header-foreground">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">
            Supply Chain Intelligence Dashboard
          </h1>
          <p className="text-sm opacity-80">
            障害福祉支援部 競合・規制環境 監視ダッシュボード
          </p>
        </div>
        <div className="text-xs opacity-60 text-right hidden sm:block">
          <p>最終更新: 2026-02-14</p>
          <p>Phase 1 - 静的データ版</p>
        </div>
      </div>
    </header>
  )
}
