import { scanPageLinks, type ScannedLinkItem } from "../lib/grabber/scanner";

export default defineContentScript({
  matches: ["*://*/*"],
  registration: "runtime", // ON-DEMAND inject only! Zero page-load impact.
  main() {
    // If modal already open, focus it and do not re-create
    const existing = document.getElementById("mjdm-grabber-overlay");
    if (existing) {
      existing.remove();
    }

    const scannedItems = scanPageLinks(document);
    if (scannedItems.length === 0) {
      alert("MJDM Link Grabber: No downloadable links found on this page.");
      return;
    }

    let activeFilter = "All";
    let searchQuery = "";
    let items = [...scannedItems];

    // Create host element with Shadow DOM to prevent style leakage
    const hostEl = document.createElement("div");
    hostEl.id = "mjdm-grabber-overlay";
    hostEl.style.position = "fixed";
    hostEl.style.inset = "0";
    hostEl.style.zIndex = "2147483647";
    hostEl.style.display = "flex";
    hostEl.style.alignItems = "center";
    hostEl.style.justifyContent = "center";
    hostEl.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    hostEl.style.backdropFilter = "blur(4px)";
    hostEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const shadow = hostEl.attachShadow({ mode: "open" });

    const render = () => {
      const filtered = items.filter((it) => {
        const matchesCategory = activeFilter === "All" || it.category === activeFilter;
        const matchesQuery =
          !searchQuery ||
          it.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          it.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          it.ext.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
      });

      const selectedCount = items.filter((it) => it.selected).length;
      const allFilteredSelected = filtered.length > 0 && filtered.every((it) => it.selected);

      shadow.innerHTML = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .modal {
            background: #111827;
            color: #f3f4f6;
            width: 760px;
            max-width: 90vw;
            max-height: 85vh;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px #374151;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .header {
            padding: 16px 20px;
            border-bottom: 1px solid #1f2937;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .title-area {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .badge {
            background: #3b82f6;
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .title {
            font-size: 16px;
            font-weight: 600;
          }
          .close-btn {
            background: transparent;
            border: none;
            color: #9ca3af;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          }
          .close-btn:hover { color: #f3f4f6; background: #1f2937; }
          .toolbar {
            padding: 12px 20px;
            background: #182234;
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
            border-bottom: 1px solid #1f2937;
          }
          .filter-btn {
            background: #1f2937;
            border: 1px solid #374151;
            color: #d1d5db;
            font-size: 12px;
            padding: 5px 12px;
            border-radius: 6px;
            cursor: pointer;
          }
          .filter-btn.active {
            background: #2563eb;
            color: white;
            border-color: #3b82f6;
          }
          .search-input {
            margin-left: auto;
            background: #111827;
            border: 1px solid #374151;
            color: white;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            outline: none;
            width: 200px;
          }
          .search-input:focus { border-color: #3b82f6; }
          .selection-bar {
            padding: 8px 20px;
            background: #111827;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: #9ca3af;
            border-bottom: 1px solid #1f2937;
          }
          .list {
            flex: 1;
            overflow-y: auto;
            max-height: 48vh;
          }
          .item-row {
            display: flex;
            align-items: center;
            padding: 8px 20px;
            gap: 12px;
            border-bottom: 1px solid #1a2234;
            font-size: 13px;
          }
          .item-row:hover { background: #1a2436; }
          .item-checkbox { cursor: pointer; }
          .item-name {
            font-weight: 500;
            color: #e5e7eb;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 260px;
          }
          .item-ext {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: #374151;
            color: #9ca3af;
            text-transform: uppercase;
            font-weight: bold;
          }
          .item-url {
            margin-left: auto;
            color: #6b7280;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 320px;
          }
          .footer {
            padding: 14px 20px;
            border-top: 1px solid #1f2937;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            background: #111827;
          }
          .btn {
            font-size: 13px;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            border: none;
          }
          .btn-cancel { background: #1f2937; color: #d1d5db; }
          .btn-cancel:hover { background: #374151; }
          .btn-download { background: #2563eb; color: white; }
          .btn-download:hover { background: #1d4ed8; }
          .btn-download:disabled { opacity: 0.5; cursor: not-allowed; }
        </style>

        <div class="modal">
          <div class="header">
            <div class="title-area">
              <span class="badge">MJDM</span>
              <span class="title">Link Grabber</span>
              <span style="font-size: 12px; color: #9ca3af;">(${scannedItems.length} items found)</span>
            </div>
            <button class="close-btn" id="btn-close">✕</button>
          </div>

          <div class="toolbar">
            ${["All", "Compressed", "Documents", "Media", "Programs"]
              .map(
                (cat) =>
                  `<button class="filter-btn ${activeFilter === cat ? "active" : ""}" data-cat="${cat}">${cat}</button>`
              )
              .join("")}
            <input type="text" class="search-input" id="search-query" placeholder="Search or filter..." value="${searchQuery}" />
          </div>

          <div class="selection-bar">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="toggle-all" ${allFilteredSelected ? "checked" : ""} />
              <span>Select All in View (${filtered.length})</span>
            </label>
            <span>${selectedCount} of ${items.length} selected</span>
          </div>

          <div class="list">
            ${
              filtered.length === 0
                ? `<div style="padding: 40px; text-align: center; color: #6b7280; font-size: 13px;">No links match current filter.</div>`
                : filtered
                    .map(
                      (it) => `
              <div class="item-row">
                <input type="checkbox" class="item-checkbox" data-id="${it.id}" ${it.selected ? "checked" : ""} />
                <span class="item-ext">${it.ext || "BIN"}</span>
                <span class="item-name" title="${it.filename}">${it.filename}</span>
                <span class="item-url" title="${it.url}">${it.url}</span>
              </div>
            `
                    )
                    .join("")
            }
          </div>

          <div class="footer">
            <button class="btn btn-cancel" id="btn-cancel">Cancel</button>
            <button class="btn btn-download" id="btn-download" ${selectedCount === 0 ? "disabled" : ""}>
              Download Selected (${selectedCount})
            </button>
          </div>
        </div>
      `;

      // Wire event listeners
      shadow.getElementById("btn-close")?.addEventListener("click", () => hostEl.remove());
      shadow.getElementById("btn-cancel")?.addEventListener("click", () => hostEl.remove());

      shadow.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          activeFilter = (e.currentTarget as HTMLElement).getAttribute("data-cat") || "All";
          render();
        });
      });

      const searchInput = shadow.getElementById("search-query") as HTMLInputElement;
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          searchQuery = (e.target as HTMLInputElement).value;
          render();
        });
      }

      shadow.getElementById("toggle-all")?.addEventListener("change", (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        const filteredIds = new Set(filtered.map((f) => f.id));
        items.forEach((it) => {
          if (filteredIds.has(it.id)) {
            it.selected = checked;
          }
        });
        render();
      });

      shadow.querySelectorAll(".item-checkbox").forEach((cb) => {
        cb.addEventListener("change", (e) => {
          const id = (e.target as HTMLElement).getAttribute("data-id");
          const target = items.find((it) => it.id === id);
          if (target) {
            target.selected = (e.target as HTMLInputElement).checked;
          }
          render();
        });
      });

      shadow.getElementById("btn-download")?.addEventListener("click", () => {
        const selectedItems = items.filter((it) => it.selected);
        if (
          selectedItems.length > 0 &&
          typeof browser !== "undefined" &&
          browser.runtime?.sendMessage
        ) {
          browser.runtime.sendMessage({
            type: "GRABBER_DOWNLOAD_BATCH",
            items: selectedItems.map((it) => ({
              url: it.url,
              filename: it.filename,
              referrer: window.location.href,
            })),
          });
        }
        hostEl.remove();
      });
    };

    // Close on Escape key
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hostEl.remove();
        window.removeEventListener("keydown", onKey);
      }
    };
    window.addEventListener("keydown", onKey);

    render();
    document.body.appendChild(hostEl);
  },
});
