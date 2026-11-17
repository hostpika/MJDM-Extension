import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  getSettings,
  saveSettings,
  DEFAULT_FILE_TYPES,
  type ExtensionSettings,
} from "../../lib/storage";
import { t, type Language } from "../../lib/i18n";

export function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [newSite, setNewSite] = useState("");
  const [fileTypesText, setFileTypesText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setFileTypesText(s.fileTypes.join(" "));
    });
  }, []);

  if (!settings) {
    return <div style={{ padding: "24px", color: "#fff" }}>Loading settings...</div>;
  }

  const lang = settings.language || "en";

  const handleSave = async () => {
    const parsedTypes = fileTypesText
      .split(/[\s,]+/)
      .map((t) => t.replace(/^\./, "").toLowerCase().trim())
      .filter(Boolean);

    await saveSettings({
      ...settings,
      fileTypes: parsedTypes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addSite = () => {
    const site = newSite.trim().toLowerCase();
    if (site && !settings.excludedSites.includes(site)) {
      setSettings({
        ...settings,
        excludedSites: [...settings.excludedSites, site],
      });
      setNewSite("");
    }
  };

  const removeSite = (site: string) => {
    setSettings({
      ...settings,
      excludedSites: settings.excludedSites.filter((s) => s !== site),
    });
  };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#111827",
        color: "#f3f4f6",
        borderRadius: "12px",
        border: "1px solid #1f2937",
        boxSizing: "border-box",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          borderBottom: "1px solid #1f2937",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/icon/48.png"
            alt="MJDM"
            width={36}
            height={36}
            style={{ borderRadius: "8px", display: "block" }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>{t("title", lang)}</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
              {t("optionsLink", lang).replace(" →", "")}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "#9ca3af" }}>{t("language", lang)}:</label>
          <select
            value={settings.language}
            onChange={(e) =>
              setSettings({
                ...settings,
                language: (e.target as HTMLSelectElement).value as Language,
              })
            }
            style={{
              backgroundColor: "#1f2937",
              color: "#fff",
              border: "1px solid #374151",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="en">English</option>
            <option value="bn">বাংলা (Bangla)</option>
          </select>
        </div>
      </div>

      {/* Main Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* General Toggles */}
        <div
          style={{
            backgroundColor: "#1f2937",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #374151",
          }}
        >
          <h3
            style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#38bdf8" }}
          >
            {t("interceptionRules", lang)}
          </h3>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: (e.target as HTMLInputElement).checked })
              }
            />
            <span>{t("enableInterception", lang)}</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.altBypassEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  altBypassEnabled: (e.target as HTMLInputElement).checked,
                })
              }
            />
            <span>{t("altBypass", lang)}</span>
          </label>

          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#d1d5db",
                marginBottom: "6px",
              }}
            >
              {t("minSize", lang)}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                min="0"
                value={Math.round(settings.minSize / 1024)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minSize: Math.max(
                      0,
                      parseInt((e.target as HTMLInputElement).value || "0", 10) * 1024
                    ),
                  })
                }
                style={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#fff",
                  width: "120px",
                  fontSize: "13px",
                }}
              />
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>{t("minSizeHint", lang)}</span>
            </div>
          </div>
        </div>

        {/* File Types */}
        <div
          style={{
            backgroundColor: "#1f2937",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #374151",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#38bdf8" }}>
              {t("capturedTypes", lang)}
            </h3>
            <button
              onClick={() => setFileTypesText(DEFAULT_FILE_TYPES.join(" "))}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {t("resetDefaults", lang)}
            </button>
          </div>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#9ca3af" }}>
            {t("fileTypesHint", lang)}
          </p>
          <textarea
            rows={4}
            value={fileTypesText}
            onChange={(e) => setFileTypesText((e.target as HTMLTextAreaElement).value)}
            style={{
              width: "100%",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "6px",
              padding: "8px 10px",
              color: "#fff",
              fontSize: "13px",
              fontFamily: "monospace",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Excluded Sites */}
        <div
          style={{
            backgroundColor: "#1f2937",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #374151",
          }}
        >
          <h3
            style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#38bdf8" }}
          >
            {t("excludedDomains", lang)}
          </h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#9ca3af" }}>
            {t("excludedDomainsHint", lang)}
          </p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              placeholder={t("addDomainPlaceholder", lang)}
              value={newSite}
              onChange={(e) => setNewSite((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSite();
              }}
              style={{
                flex: 1,
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "6px",
                padding: "6px 10px",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <button
              onClick={addSite}
              style={{
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {t("addBtn", lang)}
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {settings.excludedSites.length === 0 ? (
              <span style={{ fontSize: "12px", color: "#6b7280" }}>{t("noExcluded", lang)}</span>
            ) : (
              settings.excludedSites.map((site) => (
                <span
                  key={site}
                  style={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {site}
                  <button
                    onClick={() => removeSite(site)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginTop: "8px",
          }}
        >
          {saved && (
            <span style={{ color: "#4ade80", fontSize: "13px" }}>{t("settingsSaved", lang)}</span>
          )}
          <button
            onClick={handleSave}
            style={{
              backgroundColor: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 20px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            {t("saveSettings", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(<OptionsApp />, root);
}
