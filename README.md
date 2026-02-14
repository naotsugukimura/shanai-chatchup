# SCI Dashboard (Supply Chain Intelligence)

SMS障害福祉支援部 向けの競合環境モニタリングダッシュボード。

5レイヤーの競合環境フレームワークに基づき、32の監視対象エンティティ・10のトリガー/テーマを構造化して閲覧できる社内Webダッシュボード。

## 主要機能

### 4つのタブ

| タブ | 内容 |
|------|------|
| **エンティティ** | 32の監視対象を3つのビュー（カード/テーブル/レイヤー別）で表示。フィルター・検索・影響マッピングマトリクス付き |
| **トリガー/テーマ** | 10のイベントベース監視項目をカテゴリ別に表示。政策変更・市場参入・M&A・技術動向等 |
| **ニュース** | 各社の動向ニュースをタイムライン形式で表示。カテゴリフィルター・関連エンティティリンク付き |
| **影響連鎖** | サプライチェーンの影響伝播をツリー構造で可視化。「厚労省→事業所→ソフトウェア企業」の連鎖 |

### 5レイヤー構造

| Layer | 名称 | 対象例 |
|-------|------|--------|
| L1 | 政策・規制 | 厚労省、国保中央会、デジタル庁 |
| L2 | 上場大手 | LITALICO、ウェルビー、ココルポート |
| L3 | 直接競合 | atGP、knowbe、HUG、ほのぼのmore |
| L4 | 隣接サービス | Special Learning、デコボコベース |
| L5 | テクノロジー指標 | LayerX、リクルート、OpenAI |

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **UIコンポーネント**: shadcn/ui v3
- **フォント**: Noto Sans JP
- **状態管理**: useReducer
- **データ**: 静的JSON (SSG)
- **出力**: 完全静的サイト (`output: 'export'`)

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 静的サイトのプレビュー
npx serve out
```

## ディレクトリ構成

```
shanai-chatchup/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # メインページ (Server Component)
│   ├── globals.css             # テーマカラー定義
│   └── entity/[id]/
│       ├── page.tsx            # エンティティ詳細ページ (SSG)
│       └── EntityDetailClient.tsx
├── components/
│   ├── DashboardClient.tsx     # メインオーケストレーター
│   ├── EntityCard.tsx          # エンティティカード
│   ├── EntityTable.tsx         # テーブルビュー
│   ├── FilterSidebar.tsx       # フィルターコントロール
│   ├── SummaryCards.tsx        # KPIカード
│   ├── ImpactMatrix.tsx        # 影響マッピングマトリクス
│   ├── TriggerCard.tsx         # トリガーカード
│   ├── NewsTimeline.tsx        # ニュースタイムライン
│   ├── SupplyChainTree.tsx     # サプライチェーンツリー
│   ├── Header.tsx              # ヘッダー
│   ├── SearchBar.tsx           # 検索バー
│   ├── ViewToggle.tsx          # ビュー切替
│   ├── LayerBadge.tsx          # レイヤーバッジ
│   ├── ImpactBadge.tsx         # 影響度バッジ
│   └── BusinessTag.tsx         # 事業タグ
├── data/
│   ├── entities.json           # 32エンティティ
│   ├── layers.json             # 5レイヤー定義
│   ├── triggers.json           # 10トリガー
│   ├── news.json               # ニュースデータ
│   └── supply-chain.json       # サプライチェーン定義
├── lib/
│   ├── types.ts                # TypeScript型定義
│   ├── constants.ts            # 共有定数
│   ├── utils.ts                # ヘルパー関数
│   ├── filters.ts              # フィルタリング・ソートロジック
│   └── trigger-types.ts        # トリガー型定義
└── next.config.ts
```

## データの更新方法

各JSONファイルを直接編集することでデータを更新できます:

- **エンティティ追加**: `data/entities.json` に新しいオブジェクトを追加
- **トリガー追加**: `data/triggers.json` に新しいオブジェクトを追加
- **ニュース追加**: `data/news.json` に新しいオブジェクトを追加
- **影響連鎖追加**: `data/supply-chain.json` の `chains` 配列に新しい連鎖を追加

## デプロイ

静的サイトとして出力されるため、以下のプラットフォームにデプロイ可能:

- **Vercel** (推奨): `vercel` コマンドまたはGitHub連携
- **Netlify**: `out/` ディレクトリを公開
- **GitHub Pages**: `out/` ディレクトリを公開
- **社内サーバー**: `npm run build` 後、`out/` ディレクトリをWebサーバーに配置
