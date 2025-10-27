# Vercelデプロイガイド

## 🚀 簡単デプロイ（5分で完了）

### ステップ1: GitHubにpush

```bash
# Gitリポジトリを初期化（まだの場合）
git init

# すべてのファイルをステージング
git add .

# コミット
git commit -m "Ready for Vercel deployment"

# GitHubリポジトリを追加（事前にGitHub上でリポジトリを作成）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# プッシュ
git push -u origin main
```

### ステップ2: Vercelでインポート

1. **Vercelにログイン**
   - https://vercel.com にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトをインポート**
   - "Add New Project" をクリック
   - GitHubリポジトリ一覧から `action-visualizer` を選択
   - "Import" をクリック

3. **プロジェクト設定を確認**
   - Framework Preset: **Next.js** （自動検出）
   - Root Directory: `./` （デフォルトのまま）
   - Build Command: `npm run build` （デフォルトのまま）
   - Output Directory: `.next` （デフォルトのまま）

### ステップ3: 環境変数を設定

**重要: デプロイ前に環境変数を設定してください**

1. "Environment Variables" セクションを展開

2. 以下の変数を追加：

| Name | Value | 説明 |
|------|-------|------|
| `GEMINI_API_KEY` | `AIza...` | Gemini API Key（必須） |
| `GOOGLE_SEARCH_API_KEY` | `AIza...` | Google Search API Key |
| `GOOGLE_SEARCH_ENGINE_ID` | `1234...` | Search Engine ID |

3. 各環境変数について：
   - Environment: **Production, Preview, Development** すべて選択
   - "Add" をクリック

### ステップ4: デプロイ

1. **"Deploy" をクリック**
   - ビルドが自動的に開始されます
   - 進捗状況をリアルタイムで確認できます

2. **デプロイ完了を待つ（約3-5分）**
   - ✅ Build successful
   - ✅ Deployment ready

3. **URLを確認**
   - `https://your-project.vercel.app` 形式のURLが発行されます
   - "Visit" をクリックしてアプリにアクセス

## 🔧 デプロイ後の設定

### カスタムドメインの追加

1. Project Settings → Domains
2. "Add Domain" をクリック
3. 独自ドメインを入力
4. DNS設定を更新（Vercelが手順を表示）

### 環境変数の更新

1. Project Settings → Environment Variables
2. 変数を選択して "Edit" or "Delete"
3. 保存後、自動的に再デプロイ

### ログの確認

1. Deployments タブ
2. 任意のデプロイをクリック
3. "View Function Logs" でAPIログを確認

## 🔄 継続的デプロイ

Vercelは自動的にGitHubと連携します：

- `main` ブランチへのpush → **本番環境**に自動デプロイ
- Pull Request作成 → **プレビュー環境**を自動作成
- コミット毎に新しいデプロイ

```bash
# 変更をコミット & プッシュすると自動デプロイ
git add .
git commit -m "Update feature"
git push
```

## 🐛 トラブルシューティング

### ビルドエラー

```
Error: Cannot find module 'xxx'
```

**解決策**: `package.json` の依存関係を確認
```bash
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### 環境変数が反映されない

1. Vercel Dashboard → Settings → Environment Variables
2. 変数が正しく設定されているか確認
3. **Redeploy** ボタンをクリック

### API呼び出しエラー

- Function Logs を確認（Deployments → View Function Logs）
- `GEMINI_API_KEY` が正しく設定されているか確認
- APIキーの使用制限・レート制限を確認

### Edge Runtimeエラー

```
Error: The Edge Runtime does not support Node.js 'xyz' module
```

**解決策**: Edge Runtimeでサポートされていない機能を使用している
- APIルートのファイルで `export const runtime = "edge"` を確認
- Node.js専用のモジュール（`fs`, `path`など）を削除

## 📊 パフォーマンス最適化

### Vercel Analytics（オプション）

1. Project Settings → Analytics
2. "Enable" をクリック
3. リアルタイムのパフォーマンス指標を確認

### Speed Insights

1. Project Settings → Speed Insights
2. "Enable" をクリック
3. ページ速度のボトルネックを特定

## 🔐 セキュリティ

### 環境変数のベストプラクティス

- ✅ `.env.local` をGitにコミットしない
- ✅ Vercel Dashboardで環境変数を管理
- ✅ 定期的にAPIキーをローテーション
- ❌ コード内にAPIキーをハードコードしない

### CORS設定（必要な場合）

`next.config.ts` に追加：
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
        ],
      },
    ];
  },
};
```

## 📞 サポート

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- 社内Slackチャンネル: #dev-support
