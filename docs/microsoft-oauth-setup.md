# Microsoft OAuth 2.0 セットアップガイド

Outlook Calendar連携のためのMicrosoft Azure ADアプリ登録手順です。

## 1. Azure Portalでアプリを登録

### 1.1 Azure Portalにアクセス
1. [Azure Portal](https://portal.azure.com/)にアクセス
2. Microsoft アカウントでログイン（会社アカウントまたは個人アカウント）

### 1.2 アプリ登録
1. 左メニューから「Microsoft Entra ID」（旧Azure Active Directory）を選択
2. 「アプリの登録」→「新規登録」をクリック

### 1.3 アプリ情報を入力
- **名前**: `営業AIポータル - Calendar Finder`（任意の名前）
- **サポートされているアカウントの種類**:
  - 「任意の組織ディレクトリ内のアカウントと個人のMicrosoftアカウント」を選択
  - これにより、個人のOutlookアカウントとビジネスアカウント両方に対応
- **リダイレクトURI**:
  - プラットフォーム: `Web`
  - URL:
    - 開発環境: `http://localhost:3000/api/auth/callback/microsoft`
    - 本番環境: `https://your-app-domain.vercel.app/api/auth/callback/microsoft`

**注意**: 本番環境のURLは後で追加できます。

4. 「登録」ボタンをクリック

## 2. Client IDとClient Secretを取得

### 2.1 Client IDを取得
1. アプリ登録後、「概要」ページに表示される
2. 「アプリケーション (クライアント) ID」をコピー
3. `.env.local`の`MICROSOFT_CLIENT_ID`に貼り付け

### 2.2 Client Secretを作成
1. 左メニューから「証明書とシークレット」を選択
2. 「クライアント シークレット」タブ→「新しいクライアント シークレット」をクリック
3. 説明: `営業AIポータル Calendar連携` （任意）
4. 有効期限: `24か月`（推奨）または`カスタム`
5. 「追加」をクリック
6. **重要**: 表示された「値」を**すぐにコピー**（後で表示できなくなります）
7. `.env.local`の`MICROSOFT_CLIENT_SECRET`に貼り付け

## 3. API権限を設定

### 3.1 権限を追加
1. 左メニューから「APIのアクセス許可」を選択
2. 「アクセス許可の追加」をクリック
3. 「Microsoft Graph」を選択
4. 「委任されたアクセス許可」を選択
5. 以下の権限を検索して追加:
   - `Calendars.Read` - ユーザーのカレンダーを読み取る
   - `User.Read` - ユーザーの基本プロファイルを読み取る
   - `offline_access` - リフレッシュトークンを取得

### 3.2 管理者の同意（オプション）
- 組織内で使用する場合は「[組織名]に管理者の同意を与えます」をクリック
- 個人アカウントのみで使用する場合は不要

## 4. リダイレクトURIを追加（本番環境）

### 4.1 Vercelデプロイ後
1. Vercelでデプロイ完了後、本番URLを取得
2. Azure Portal → アプリ登録 → 「認証」
3. 「プラットフォームの追加」→「Web」
4. リダイレクトURI: `https://your-app-domain.vercel.app/api/auth/callback/microsoft`
5. 「構成」をクリック

## 5. 環境変数を設定

### 5.1 ローカル開発（`.env.local`）
```bash
MICROSOFT_CLIENT_ID=<アプリケーション (クライアント) ID>
MICROSOFT_CLIENT_SECRET=<クライアント シークレットの値>
```

### 5.2 Vercel本番環境
1. Vercelプロジェクト → Settings → Environment Variables
2. 以下を追加:
   - `MICROSOFT_CLIENT_ID`: `<アプリケーション (クライアント) ID>`
   - `MICROSOFT_CLIENT_SECRET`: `<クライアント シークレットの値>`
3. 「Save」をクリック
4. 再デプロイ（環境変数反映のため）

## 6. 動作確認

### 6.1 ローカルで確認
```bash
npm run dev
```

1. `http://localhost:3000/agents/calendar-finder`にアクセス
2. 「Outlook」タブを選択
3. 「Outlookカレンダーと連携」ボタンをクリック
4. Microsoftログイン画面が表示される
5. アカウントでログイン
6. 権限の同意画面で「承諾」をクリック
7. カレンダー連携完了

### 6.2 本番環境で確認
Vercelデプロイ後、同様の手順で確認

## トラブルシューティング

### エラー: "redirect_uri_mismatch"
- Azure Portalの「認証」設定でリダイレクトURIが正しいか確認
- 開発環境と本番環境で異なるURIが必要

### エラー: "invalid_client"
- Client IDまたはClient Secretが間違っている
- Azure Portalの「概要」と「証明書とシークレット」で再確認

### エラー: "AADSTS65001: The user or administrator has not consented"
- API権限が正しく設定されているか確認
- 組織アカウントの場合、管理者の同意が必要な場合がある

### カレンダーが取得できない
- API権限に`Calendars.Read`が含まれているか確認
- トークンの有効期限が切れている場合は再認証が必要

## 参考リンク

- [Microsoft identity platform documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API - Calendar](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Azure Portal - App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
