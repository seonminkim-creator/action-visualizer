// Gemini API レート制限ユーティリティ

/**
 * シンプルなレート制限実装
 *
 * 複数の並行リクエストを制限し、API過負荷を防ぐ
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private minInterval: number; // ミリ秒
  private lastRequestTime = 0;

  constructor(maxConcurrent: number = 2, minInterval: number = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
  }

  /**
   * リクエストを実行（レート制限付き）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 並行実行数が上限に達している場合は待機
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    // 最小インターバルを確保
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      return await fn();
    } finally {
      this.activeRequests--;

      // 待機中のリクエストがあれば次を実行
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      minInterval: this.minInterval,
    };
  }
}

// Gemini API用のグローバルレート制限インスタンス
// 並行実行数: 1、最小インターバル: 2秒（より保守的な設定）
export const geminiRateLimiter = new RateLimiter(1, 2000);
