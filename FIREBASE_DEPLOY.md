# Firebase Hostingへのデプロイ手順

このドキュメントは、営業AIポータルをFirebase Hostingにデプロイする手順を説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- Googleアカウントを持っていること
- Firebase CLIがインストール済み（自動でインストール済み）

## 🔧 準備

### 1. Firebaseプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `action-visualizer`）
4. Google アナリティクスは任意で有効化
5. 「プロジェクトを作成」をクリック

### 2. Firebase CLI にログイン

ターミナルで以下のコマンドを実行：

```bash
firebase login
```

ブラウザが開くので、Googleアカウントでログインしてください。

### 3. Firebaseプロジェクトと連携

`.firebaserc` ファイルの `default` プロジェクト名を、先ほど作成したFirebaseプロジェクトのIDに変更してください：

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

**プロジェクトIDの確認方法**:
- Firebase Console → プロジェクト設定 → プロジェクトID

または、以下のコマンドでプロジェクトを選択：

```bash
firebase use --add
```

### 4. 環境変数を設定

Firebase Hostingでは環境変数を以下の方法で設定します：

#### 方法1: Firebase Environment Config（推奨）

```bash
# Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY

# Google Search API（オプション）
firebase functions:secrets:set GOOGLE_SEARCH_API_KEY
firebase functions:secrets:set GOOGLE_SEARCH_ENGINE_ID
```

#### 方法2: `.env.production` ファイルを作成

プロジェクトルートに `.env.production` ファイルを作成：

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**注意**: `.env.production` ファイルは `.gitignore` に追加してください（機密情報のため）

## 🚀 デプロイ

### デプロイコマンド

```bash
npm run deploy
```

または

```bash
firebase deploy --only hosting
```

### 初回デプロイ

初回デプロイ時、Firebaseが自動的に：
- Next.jsアプリをビルド
- Cloud Functionsを作成（APIルート用）
- Firebase Hostingにデプロイ

デプロイには **3〜5分** かかります。

### デプロイ完了

デプロイが完了すると、以下のようなURLが表示されます：

```
✔ Deploy complete!

Hosting URL: https://action-visualizer.web.app
```

このURLにアクセスして、アプリが正常に動作することを確認してください。

## 🔍 デプロイ後の確認

### 1. アプリが表示されるか確認

ブラウザで `https://your-project-id.web.app` にアクセス

### 2. 各エージェントが動作するか確認

- ✅ 空き時間みえーるくん
- ✅ 話題提案くん
- ✅ 会議まとめくん
- ✅ メール返信叩きくん
- ✅ タスクみえーるくん

### 3. APIが動作するか確認

ブラウザの開発者ツール（F12）でコンソールを開き、エラーがないか確認

## ⚙️ カスタムドメインの設定（オプション）

### カスタムドメインを使用する場合

1. Firebase Console → Hosting → 「カスタムドメインを追加」
2. ドメイン名を入力（例: `ai-portal.example.com`）
3. 指示に従ってDNS設定を追加
4. SSL証明書が自動で発行されるまで待つ（最大24時間）

## 🛠 トラブルシューティング

### エラー: "Firebase project not found"

`.firebaserc` ファイルのプロジェクトIDが正しいか確認してください。

### エラー: "GEMINI_API_KEY is not defined"

環境変数が正しく設定されているか確認：

```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### ビルドエラーが発生する場合

ローカルでビルドが成功するか確認：

```bash
npm run build
```

### Cloud Functions のログを確認

```bash
firebase functions:log
```

または Firebase Console → Functions → ログ

## 📊 料金について

### Firebase Hosting（無料枠）
- 1 GB ストレージ
- 10 GB/月 転送量
- カスタムドメイン & SSL 無料

### Cloud Functions（無料枠）
- 200万リクエスト/月
- 400,000 GB-秒/月 のコンピューティング時間
- 200,000 GHz-秒/月 のCPU時間

**推定コスト**: 通常の使用では無料枠内で収まります。

## 🔄 更新とデプロイ

コードを更新した後：

```bash
git add .
git commit -m "更新内容"
git push
npm run deploy
```

## 📝 注意事項

1. **Edge Runtime について**
   - Next.js のEdge RuntimeはCloud Functionsとして動作します
   - 一部の Node.js APIは使用できない場合があります

2. **Cold Start（コールドスタート）**
   - Cloud Functionsは最初のリクエスト時に起動時間がかかります（1〜3秒）
   - 頻繁にアクセスされる場合は自動的に高速化されます

3. **ログの確認**
   - Firebase Console → Functions → ログ でエラーを確認できます
   - `console.log()` はCloud Functionsのログに出力されます

## 🆘 サポート

問題が発生した場合：
1. Firebase Console のログを確認
2. ローカル環境で正常に動作するか確認
3. Firebase公式ドキュメントを参照: https://firebase.google.com/docs/hosting

---

作成日: 2025-10-27
