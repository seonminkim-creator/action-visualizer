"use client";

import { useEffect, useState } from "react";

interface AutoRefreshConfig {
  enabled: boolean;
  intervalMinutes: number;
}

/**
 * 定期的にアプリケーションバージョンをチェックし、
 * 新しいバージョンがあれば自動でリロードする
 */
export function useAutoRefresh() {
  const [config, setConfig] = useState<AutoRefreshConfig>({
    enabled: false,
    intervalMinutes: 30, // デフォルト30分
  });
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // 設定をlocalStorageから読み込み
  useEffect(() => {
    const savedConfig = localStorage.getItem("autoRefreshConfig");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error("Failed to parse auto refresh config:", error);
      }
    }
  }, []);

  // 初回バージョン取得
  useEffect(() => {
    async function fetchInitialVersion() {
      try {
        const response = await fetch("/api/version");
        const data = await response.json();
        setCurrentVersion(data.version);
        console.log("📦 現在のバージョン:", data.version);
      } catch (error) {
        console.error("Failed to fetch initial version:", error);
      }
    }

    fetchInitialVersion();
  }, []);

  // 定期チェック
  useEffect(() => {
    if (!config.enabled || !currentVersion) {
      return;
    }

    const intervalMs = config.intervalMinutes * 60 * 1000;

    const checkVersion = async () => {
      try {
        console.log("🔍 バージョンチェック中...");
        const response = await fetch("/api/version", {
          cache: "no-store",
        });
        const data = await response.json();

        setLastCheck(new Date());

        if (data.version !== currentVersion) {
          console.log("🆕 新しいバージョンを検出:", data.version);
          console.log("🔄 3秒後にリロードします...");

          // 3秒後にリロード（ユーザーに時間を与える）
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          console.log("✅ 最新バージョンです");
        }
      } catch (error) {
        console.error("❌ バージョンチェックエラー:", error);
      }
    };

    // 初回チェック
    checkVersion();

    // 定期チェック
    const interval = setInterval(checkVersion, intervalMs);

    return () => clearInterval(interval);
  }, [config.enabled, config.intervalMinutes, currentVersion]);

  // 設定を保存
  const updateConfig = (newConfig: Partial<AutoRefreshConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem("autoRefreshConfig", JSON.stringify(updated));
  };

  return {
    config,
    updateConfig,
    lastCheck,
    currentVersion,
  };
}
