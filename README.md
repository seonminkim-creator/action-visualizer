# 営業AIポータル

営業活動をアシスタントする専門AIエージェント集

## 🚀 機能

### 1. 空き時間検索くん 📅
- Googleカレンダー連携
- 空き時間の可視化
- 祝日対応

### 2. 話題提案くん 🌱
- 農家さんとの会話のきっかけになる旬な話題を提供
- 地域別の情報収集
- Google検索API連携

### 3. 会議まとめくん 📝
- 音声録音機能（マイク・システム音声対応）
- AI文字起こし（Gemini 2.0 Flash）
- 議事録自動生成
- TODO自動抽出
- 履歴管理

### 4. メール返信叩きくん 📧
- Coming Soon

### 5. タスク整理くん ✅
- メール・議事録からタスクを可視化
- パスワード保護（1234）

## 🛠 技術スタック

- **Framework**: Next.js 16.0.0 (App Router)
- **Runtime**: Edge Runtime
- **AI**: Google Gemini 2.5 Pro / 2.0 Flash
- **UI**: React 19, Lucide Icons
- **Styling**: Tailwind CSS 4
- **Deploy**: Vercel

## 📦 セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd action-visualizer
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local` ファイルを作成：

```env
# Gemini API Key (必須)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Search API (話題提案くん用)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Google Calendar API (空き時間検索くん用)
# OAuth認証のため、Google Cloud Consoleで設定が必要
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

## 🌐 Vercelへのデプロイ

### 方法1: GitHub連携（推奨）

1. **GitHubにリポジトリをpush**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Vercelでプロジェクトをインポート**
   - [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
   - "Add New Project" をクリック
   - GitHubリポジトリを選択
   - "Import" をクリック

3. **環境変数を設定**
   - Project Settings → Environment Variables
   - 以下の環境変数を追加：
     - `GEMINI_API_KEY`
     - `GOOGLE_SEARCH_API_KEY`
     - `GOOGLE_SEARCH_ENGINE_ID`

4. **デプロイ**
   - "Deploy" をクリック
   - 数分でデプロイ完了！

### 方法2: Vercel CLI

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel

# 環境変数を設定
vercel env add GEMINI_API_KEY
vercel env add GOOGLE_SEARCH_API_KEY
vercel env add GOOGLE_SEARCH_ENGINE_ID

# 本番デプロイ
vercel --prod
```

## 🔑 API キーの取得方法

### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. "Get API Key" をクリック
3. APIキーをコピー

### Google Search API
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. Custom Search API を有効化
3. APIキーを作成
4. [Programmable Search Engine](https://programmablesearchengine.google.com/) でSearch Engine IDを取得

### Google Calendar API
1. Google Cloud Consoleで OAuth 2.0 認証情報を作成
2. アプリ内でOAuth認証フローを実装

## 📁 プロジェクト構造

```
action-visualizer/
├── app/
│   ├── agents/          # 各エージェントのページ
│   │   ├── calendar-finder/
│   │   ├── agri-talk/
│   │   ├── meeting-recorder/
│   │   └── task-visualizer/
│   ├── api/             # APIルート（Edge Runtime）
│   │   ├── calendar/
│   │   ├── agri-talk/
│   │   ├── meeting-summary/
│   │   ├── transcribe/
│   │   └── analyze/
│   ├── components/      # 共通コンポーネント
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx         # ホーム画面
├── public/
├── vercel.json          # Vercel設定
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 🎯 使い方

### 会議まとめくん

1. **録音方法を選択**
   - マイク: 直接録音
   - システム音声: WEBミーティング録音（画面共有が必要）

2. **録音開始**
   - 録音ボタンをクリック
   - 会議内容を録音

3. **録音停止**
   - 自動的に文字起こし開始
   - 設定でONにすれば、自動で議事録生成

4. **議事録確認**
   - 会議サマリー、TODOリスト、詳細議事録を確認
   - コピーボタンで各セクションをコピー可能

5. **履歴管理**
   - 最新10件まで保存
   - クリックで過去の議事録を再表示

## 🔒 セキュリティ

- 環境変数は `.env.local` に保存（Gitにコミットしない）
- Vercelの Environment Variables を使用して本番環境のシークレットを管理
- タスク整理くんはパスワード保護（デフォルト: 1234）

## 📝 ライセンス

Private

## 🤝 貢献

このプロジェクトは社内ツールです。

## 📞 サポート

問題が発生した場合は、開発チームにお問い合わせください。
