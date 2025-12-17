/**
 * Gemini API レート制限管理
 *
 * 503エラーを最大限回避するためのグローバルキュー管理
 */

// グローバルリクエストキュー（サーバー側でシングルトン）
interface QueueItem {
  id: string;
  timestamp: number;
  resolve: () => void;
}

class GeminiRateLimiter {
  private queue: QueueItem[] = [];
  private lastRequestTime = 0;
  private consecutiveErrors = 0;
  private baseIntervalMs = 3000; // 基本間隔: 3秒
  private maxIntervalMs = 60000; // 最大間隔: 60秒

  /**
   * リクエスト前に呼び出し、適切な待機時間を確保
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const interval = this.calculateInterval();
    const waitTime = Math.max(0, this.lastRequestTime + interval - now);

    if (waitTime > 0) {
      console.log(`⏱️ Rate limit: ${waitTime}ms 待機中... (連続エラー: ${this.consecutiveErrors}回)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 動的間隔計算（連続エラーに基づく）
   */
  private calculateInterval(): number {
    if (this.consecutiveErrors === 0) {
      return this.baseIntervalMs;
    }

    // エクスポネンシャルバックオフ（エラー回数に応じて増加）
    const backoffMultiplier = Math.pow(2, Math.min(this.consecutiveErrors, 5));
    return Math.min(this.baseIntervalMs * backoffMultiplier, this.maxIntervalMs);
  }

  /**
   * 成功時に呼び出し（エラーカウントをリセット）
   */
  recordSuccess(): void {
    if (this.consecutiveErrors > 0) {
      console.log(`✅ Rate limit: エラーカウントをリセット (${this.consecutiveErrors} → 0)`);
    }
    this.consecutiveErrors = 0;
  }

  /**
   * エラー時に呼び出し（バックオフを強化）
   */
  recordError(statusCode?: number): void {
    this.consecutiveErrors++;

    // 503エラーの場合は追加のペナルティ
    if (statusCode === 503) {
      this.consecutiveErrors = Math.max(this.consecutiveErrors, 3);
      console.log(`🔴 Rate limit: 503エラー検出、強制バックオフ (連続エラー: ${this.consecutiveErrors}回)`);
    } else {
      console.log(`⚠️ Rate limit: エラー記録 (連続エラー: ${this.consecutiveErrors}回)`);
    }
  }

  /**
   * 現在の推奨待機時間を取得（フロントエンド用）
   */
  getRecommendedWaitMs(): number {
    return this.calculateInterval();
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.consecutiveErrors = 0;
    this.lastRequestTime = 0;
    console.log(`🔄 Rate limit: 状態をリセット`);
  }
}

// シングルトンインスタンス
export const geminiRateLimiter = new GeminiRateLimiter();
