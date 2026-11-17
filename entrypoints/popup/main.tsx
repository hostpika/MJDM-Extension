import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  getSettings,
  saveSettings,
  getRecentDownloads,
  addRecentDownload,
  type RecentDownloadItem,
} from "../../lib/storage";
import { t, type Language } from "../../lib/i18n";

export function PopupApp() {
  const [connected, setConnected] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [currentHost, setCurrentHost] = useState<string>("");
  const [siteExcluded, setSiteExcluded] = useState<boolean>(false);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [speedBps, setSpeedBps] = useState<number>(0);
  const [lang, setLang] = useState<Language>("en");
  const [recentDownloads, setRecentDownloads] = useState<RecentDownloadItem[]>([]);
  const [addUrlInput, setAddUrlInput] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [detectedMedia, setDetectedMedia] = useState<any[]>([]);

  const fetchStatus = () => {
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      browser.runtime
        .sendMessage({ type: "GET_STATUS" })
        .then((res: any) => {
          if (res) {
            setConnected(Boolean(res.connected));
            if (typeof res.speedBps === "number") setSpeedBps(res.speedBps);
            if (typeof res.active === "number") setActiveCount(res.active);
            if (typeof res.queued === "number") setQueuedCount(res.queued);
          }
        })
        .catch(() => {
          setConnected(false);
        });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // 1-second live interval while popup is open
    const interval = setInterval(fetchStatus, 1000);

    // Load settings and recent downloads
    getSettings().then((s) => {
      setEnabled(s.enabled);
      setLang(s.language || "en");
    });

    getRecentDownloads().then(setRecentDownloads);

    // Query active tab host
    if (typeof browser !== "undefined" && browser.tabs?.query) {
      browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.url) {
          try {
            const u = new URL(tab.url);
            setCurrentHost(u.hostname);
            getSettings().then((s) => {
              setSiteExcluded(s.excludedSites.includes(u.hostname.toLowerCase()));
            });
            // Fetch detected media for active tab
            if (tab.id && browser.runtime?.sendMessage) {
              browser.runtime
                .sendMessage({ type: "GET_TAB_MEDIA", tabId: tab.id })
                .then((res: any) => {
                  if (Array.isArray(res?.media)) {
                    setDetectedMedia(res.media);
                  }
                })
                .catch(() => {});
            }
          } catch {
            // Ignore
          }
        }
      });
    }

    return () => clearInterval(interval);
  }, []);

  const toggleSite = async () => {
    if (!currentHost) return;
    const s = await getSettings();
    const host = currentHost.toLowerCase();
    let newSites: string[];
    if (siteExcluded) {
      newSites = s.excludedSites.filter((x) => x !== host);
      setSiteExcluded(false);
    } else {
      newSites = [...s.excludedSites, host];
      setSiteExcluded(true);
    }
    await saveSettings({ excludedSites: newSites });
  };

  const toggleGlobal = async () => {
    const s = await getSettings();
    const next = !s.enabled;
    setEnabled(next);
    await saveSettings({ enabled: next });
  };

  const handleAddUrl = async (e?: Event) => {
    if (e) e.preventDefault();
    const url = addUrlInput.trim();
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      setStatusMessage("Enter valid HTTP/HTTPS URL");
      setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    const filename = url.split(/[?#]/)[0].split("/").pop() || "download.bin";
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      browser.runtime.sendMessage({
        type: "ADD_URL",
        url,
        filename,
      });
      await addRecentDownload({ id: Math.random().toString(36).substring(2, 9), url, filename });
      setRecentDownloads(await getRecentDownloads());
      setAddUrlInput("");
      setStatusMessage("Added to queue ✓");
      setTimeout(() => setStatusMessage(""), 2500);
    }
  };

  const handleQueueAction = (action: "PAUSE_ALL" | "RESUME_ALL") => {
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      browser.runtime.sendMessage({ type: action });
      setStatusMessage(action === "PAUSE_ALL" ? "Paused all" : "Resumed all");
      setTimeout(() => setStatusMessage(""), 2000);
    }
  };

  const openOptions = () => {
    if (typeof browser !== "undefined" && browser.runtime?.openOptionsPage) {
      browser.runtime.openOptionsPage();
    }
  };

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  return (
    <div
      style={{
        width: "340px",
        padding: "16px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#111827",
        color: "#f3f4f6",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/icon/48.png"
            alt="MJDM"
            width={28}
            height={28}
            style={{ borderRadius: "6px", display: "block" }}
          />
          <div>
            <div style={{ fontWeight: "600", fontSize: "13px", lineHeight: "1.2" }}>MJDM</div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>{t("title", lang)}</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "9999px",
            backgroundColor: connected ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: connected ? "#4ade80" : "#f87171",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: connected ? "#22c55e" : "#ef4444",
              display: "inline-block",
            }}
          />
          {connected ? t("connected", lang) : t("offline", lang)}
        </div>
      </div>

      {/* Disconnected Alert Banner */}
      {!connected && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              fontSize: "12px",
              color: "#f87171",
              marginBottom: "2px",
            }}
          >
            ⚠️ {t("notRunningTitle", lang)}
          </div>
          <div style={{ fontSize: "11px", color: "#d1d5db", marginBottom: "8px" }}>
            {t("notRunningDesc", lang)}
          </div>
          <button
            onClick={() => {
              if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
                browser.runtime.sendMessage({ type: "RECONNECT" }).then((res: any) => {
                  if (res?.connected) setConnected(true);
                });
              }
            }}
            style={{
              width: "100%",
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🚀 {t("startAppBtn", lang)}
          </button>
        </div>
      )}

      {/* Stats Card */}
      <div
        style={{
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
          fontSize: "11px",
          textAlign: "center",
          border: "1px solid #374151",
        }}
      >
        <div>
          <div style={{ color: "#9ca3af" }}>{t("activeDownloads", lang)}</div>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#38bdf8" }}>{activeCount}</div>
        </div>
        <div>
          <div style={{ color: "#9ca3af" }}>{t("queuedDownloads", lang)}</div>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#fbbf24" }}>{queuedCount}</div>
        </div>
        <div>
          <div style={{ color: "#9ca3af" }}>{t("currentSpeed", lang)}</div>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#4ade80" }}>
            {formatSpeed(speedBps)}
          </div>
        </div>
      </div>

      {/* Queue Quick Action Buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => handleQueueAction("PAUSE_ALL")}
          style={{
            flex: 1,
            padding: "6px",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "6px",
            color: "#f87171",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ⏸ {t("pauseAll", lang)}
        </button>
        <button
          onClick={() => handleQueueAction("RESUME_ALL")}
          style={{
            flex: 1,
            padding: "6px",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "6px",
            color: "#4ade80",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ▶ {t("resumeAll", lang)}
        </button>
      </div>

      {/* Detected Media Streams */}
      {detectedMedia.length > 0 && (
        <div
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #3b82f6",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#60a5fa",
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>🎬 Detected Video & Audio ({detectedMedia.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {detectedMedia.slice(0, 4).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "11px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "700",
                      padding: "2px 4px",
                      borderRadius: "3px",
                      textTransform: "uppercase",
                      backgroundColor:
                        item.kind === "hls"
                          ? "#b45309"
                          : item.kind === "dash"
                            ? "#0369a1"
                            : "#15803d",
                      color: "#fff",
                    }}
                  >
                    {item.kind}
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "180px",
                      color: "#e2e8f0",
                    }}
                    title={item.url}
                  >
                    {item.url.split("?")[0].split("/").pop() || "stream"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
                      browser.runtime.sendMessage({
                        type: "DOWNLOAD_MEDIA",
                        url: item.url,
                        kind: item.kind,
                        pageTitle: currentHost || "media",
                        pageUrl: `https://${currentHost}`,
                      });
                      setStatusMessage("Download started!");
                      setTimeout(() => setStatusMessage(""), 2500);
                    }
                  }}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "10px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add URL Form */}
      <form onSubmit={handleAddUrl} style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <input
          type="text"
          placeholder={t("addUrlPlaceholder", lang)}
          value={addUrlInput}
          onChange={(e) => setAddUrlInput((e.target as HTMLInputElement).value)}
          style={{
            flex: 1,
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "6px 10px",
            color: "#fff",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {t("downloadBtn", lang)}
        </button>
      </form>

      {statusMessage && (
        <div
          style={{
            fontSize: "11px",
            color: "#38bdf8",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Controls & Site Toggle */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={toggleGlobal}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: enabled ? "#1e293b" : "#1f2937",
            color: "#f3f4f6",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <span>{t("autoIntercept", lang)}</span>
          <span style={{ fontWeight: "700", color: enabled ? "#38bdf8" : "#6b7280" }}>
            {enabled ? "ON" : "OFF"}
          </span>
        </button>

        {currentHost && (
          <button
            onClick={toggleSite}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "#1f2937",
              color: "#f3f4f6",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "200px",
              }}
            >
              {t("captureOn", lang)} {currentHost}
            </span>
            <span style={{ fontWeight: "700", color: siteExcluded ? "#ef4444" : "#22c55e" }}>
              {siteExcluded ? t("excluded", lang) : t("active", lang)}
            </span>
          </button>
        )}
      </div>

      {/* Recent Downloads Section */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#9ca3af",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {t("recentDownloads", lang)}
        </div>
        {recentDownloads.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#6b7280", padding: "4px 0" }}>
            {t("noRecent", lang)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {recentDownloads.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 8px",
                  backgroundColor: "#1f2937",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "240px",
                    color: "#d1d5db",
                  }}
                  title={item.filename}
                >
                  {item.filename}
                </span>
                <span style={{ color: "#4ade80", fontSize: "10px" }}>✓</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #1f2937",
          paddingTop: "10px",
          fontSize: "11px",
          color: "#9ca3af",
        }}
      >
        <span>v0.1.0</span>
        <button
          onClick={openOptions}
          style={{
            background: "none",
            border: "none",
            color: "#38bdf8",
            cursor: "pointer",
            fontSize: "11px",
            padding: 0,
            fontWeight: "500",
          }}
        >
          {t("optionsLink", lang)}
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(<PopupApp />, root);
}
