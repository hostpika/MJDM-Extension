import type { DetectedMedia } from "../lib/media/types";

const MIN_WIDTH = 160;
const MIN_HEIGHT = 90;
const IDLE_HIDE_MS = 1800;

const OVERLAY_CSS = `
  :host { all: initial; }
  .wrap { position: absolute; top: 0; left: 0; width: 100%; height: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .btn {
    position: absolute; top: 10px; right: 10px;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 12px 7px 9px;
    background: linear-gradient(135deg, #4f46e5 0%, #0e7490 100%);
    color: #ffffff; font-size: 12px; font-weight: 600; line-height: 1;
    border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 8px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    cursor: pointer; user-select: none;
    opacity: 0; transform: translateY(-4px); pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  }
  .wrap.show .btn { opacity: 1; transform: none; pointer-events: auto; }
  .btn:hover { box-shadow: 0 6px 18px rgba(79, 70, 229, 0.55); }
  .btn:active { transform: scale(0.97); }
  .btn:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }
  .btn svg { width: 16px; height: 16px; flex: none; }
  .btn.ok { background: #15803d; }
  .btn.err { background: #b91c1c; }
  .menu {
    position: absolute; top: 48px; right: 10px;
    min-width: 230px; max-width: 320px; max-height: 60vh; overflow-y: auto;
    background: #0f172a; color: #e2e8f0;
    border: 1px solid #334155; border-radius: 10px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    font-size: 12px; pointer-events: auto;
  }
  .menu-head { padding: 8px 12px; color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 1px solid #1e293b; }
  .item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #1e293b; }
  .item:last-child { border-bottom: none; }
  .item:hover, .item:focus-visible { background: #1e293b; outline: none; }
  .item.disabled { cursor: not-allowed; opacity: 0.55; }
  .item.disabled:hover { background: transparent; }
  .q { font-weight: 700; color: #f8fafc; font-size: 13px; }
  .meta { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 11px; }
  .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .b-hls { background: #78350f; color: #fef3c7; }
  .b-dash { background: #075985; color: #e0f2fe; }
  .b-direct { background: #14532d; color: #dcfce7; }
  .empty { padding: 12px; color: #94a3b8; line-height: 1.45; }
`;

const LOGO_SVG = `<svg viewBox="0 0 512 512" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M132 330V168L256 292L380 168V330" stroke-width="52"/>
  <path d="M256 96V292" stroke-width="52"/>
  <path d="M132 420H380" stroke-width="44" opacity="0.8"/>
</svg>`;

function formatBytes(n?: number): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

function extensionOf(url: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(url.split(/[?#]/)[0]);
  return m ? m[1].toUpperCase() : "";
}

/** Most useful first: HLS auto, HLS variants by quality, direct files by size, DASH last. */
function sortStreams(list: DetectedMedia[], ownSrc?: string): DetectedMedia[] {
  const rank = (m: DetectedMedia): number => {
    if (ownSrc && m.url === ownSrc) return -1; // the file this <video> is actually playing
    if (m.kind === "hls" && /^auto/i.test(m.quality ?? "")) return 0;
    if (m.kind === "hls" && m.variantOf) return 1;
    if (m.kind === "direct") return 2;
    if (m.kind === "hls") return 3;
    return 4; // dash
  };
  return [...list].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return (b.bandwidth ?? b.contentLength ?? 0) - (a.bandwidth ?? a.contentLength ?? 0);
  });
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    let tabMedia: DetectedMedia[] = [];
    const overlays = new Set<{
      video: HTMLVideoElement;
      activate: () => void;
      update: () => void;
    }>();

    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      browser.runtime
        .sendMessage({ type: "GET_TAB_MEDIA" })
        .then((res) => {
          if (Array.isArray(res?.media)) tabMedia = res.media;
        })
        .catch(() => {});

      browser.runtime.onMessage?.addListener((message) => {
        if (message?.type === "MEDIA_DETECTED" && Array.isArray(message.allMedia)) {
          tabMedia = message.allMedia;
        }
      });
    }

    function candidates(video: HTMLVideoElement): DetectedMedia[] {
      const items = [...tabMedia];
      const src = video.currentSrc || video.src;
      if (src && /^https?:/i.test(src) && !items.some((m) => m.url === src)) {
        items.push({
          id: "video-src",
          tabId: 0,
          url: src,
          kind: "direct",
          title: document.title,
          discoveredAt: Date.now(),
        });
      }
      return sortStreams(items, src);
    }

    function attach(video: HTMLVideoElement) {
      if (video.dataset.mjdmOverlayAttached) return;
      video.dataset.mjdmOverlayAttached = "true";

      const host = document.createElement("div");
      host.className = "mjdm-video-overlay-host";
      host.style.cssText =
        "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = OVERLAY_CSS;
      shadow.appendChild(style);

      const wrap = document.createElement("div");
      wrap.className = "wrap";
      shadow.appendChild(wrap);

      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Download this video with MJDM");
      const label = document.createElement("span");
      label.textContent = "Download video";
      btn.innerHTML = LOGO_SVG;
      btn.appendChild(label);
      wrap.appendChild(btn);

      let menu: HTMLDivElement | null = null;
      let hideTimer: number | undefined;
      let pointerOverUi = false;
      let flashTimer: number | undefined;

      const closeMenu = () => {
        menu?.remove();
        menu = null;
      };

      const flash = (text: string, kind: "ok" | "err") => {
        label.textContent = text;
        btn.classList.add(kind);
        window.clearTimeout(flashTimer);
        flashTimer = window.setTimeout(() => {
          label.textContent = "Download video";
          btn.classList.remove("ok", "err");
        }, 3200);
      };

      const send = (m: DetectedMedia) => {
        closeMenu();
        label.textContent = "Sending…";
        browser.runtime
          .sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: m.url,
            kind: m.kind,
            quality: m.quality,
            contentType: m.contentType,
            pageTitle: document.title,
            pageUrl: window.location.href,
          })
          .then((res: { ok?: boolean; error?: string } | undefined) => {
            if (res?.ok) {
              flash("Sent to MJDM", "ok");
            } else {
              const reason = res?.error ?? "";
              if (/not running|unavailable/i.test(reason)) {
                flash("Start the MJDM app", "err");
              } else if (/not connected|host|native/i.test(reason)) {
                flash("MJDM not installed", "err");
              } else {
                flash("Download failed", "err");
              }
              btn.title = reason;
            }
          })
          .catch(() => flash("Could not reach MJDM", "err"));
      };

      const renderMenu = (items: DetectedMedia[]) => {
        closeMenu();
        const el = document.createElement("div");
        el.className = "menu";
        const head = document.createElement("div");
        head.className = "menu-head";
        head.textContent = "Choose quality";
        el.appendChild(head);

        if (items.length === 0) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent =
            "No downloadable stream found yet. Press play for a few seconds, then try again.";
          el.appendChild(empty);
        }

        for (const m of items) {
          const row = document.createElement("div");
          row.className = "item";
          row.tabIndex = 0;
          const unsupported = m.kind === "dash";
          if (unsupported) row.classList.add("disabled");

          const left = document.createElement("span");
          left.className = "q";
          left.textContent =
            m.quality ??
            (m.kind === "direct" ? extensionOf(m.url) || "Video file" : m.kind.toUpperCase());

          const right = document.createElement("span");
          right.className = "meta";
          // For HLS the "length" is the playlist file (a few hundred bytes), not the video.
          const size = m.kind === "direct" ? formatBytes(m.contentLength) : "";
          if (size) {
            const s = document.createElement("span");
            s.textContent = size;
            right.appendChild(s);
          }
          const badge = document.createElement("span");
          badge.className = `badge b-${m.kind}`;
          badge.textContent = unsupported ? "DASH · soon" : m.kind;
          right.appendChild(badge);

          row.appendChild(left);
          row.appendChild(right);
          if (!unsupported) {
            const go = (ev: Event) => {
              ev.stopPropagation();
              send(m);
            };
            row.addEventListener("click", go);
            row.addEventListener("keydown", (ev) => {
              if ((ev as KeyboardEvent).key === "Enter") go(ev);
            });
          }
          el.appendChild(row);
        }
        menu = el;
        wrap.appendChild(el);
      };

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (menu) {
          closeMenu();
          return;
        }
        const items = candidates(video);
        const usable = items.filter((m) => m.kind !== "dash");
        if (usable.length === 1 && items.length === 1) {
          send(usable[0]);
        } else {
          renderMenu(items);
        }
      });

      wrap.addEventListener("pointerenter", () => {
        pointerOverUi = true;
        window.clearTimeout(hideTimer);
      });
      wrap.addEventListener("pointerleave", () => {
        pointerOverUi = false;
        scheduleHide();
      });

      const usable = () => {
        const r = video.getBoundingClientRect();
        const visible =
          r.width >= MIN_WIDTH &&
          r.height >= MIN_HEIGHT &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth &&
          getComputedStyle(video).visibility !== "hidden";
        return { r, visible };
      };

      const update = () => {
        const { r, visible } = usable();
        if (!visible) {
          wrap.classList.remove("show");
          closeMenu();
          return;
        }
        host.style.left = `${r.left}px`;
        host.style.top = `${r.top}px`;
        wrap.style.width = `${r.width}px`;
        if (menu) menu.style.maxHeight = `${Math.max(120, r.height - 64)}px`;
      };

      const scheduleHide = () => {
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          if (!pointerOverUi && !menu) wrap.classList.remove("show");
        }, IDLE_HIDE_MS);
      };

      const activate = () => {
        const { visible } = usable();
        if (!visible) return;
        update();
        wrap.classList.add("show");
        scheduleHide();
      };

      video.addEventListener("play", activate);
      video.addEventListener("loadedmetadata", update);
      video.addEventListener("emptied", closeMenu);

      document.documentElement.appendChild(host);
      overlays.add({ video, activate, update });
    }

    function scan() {
      document.querySelectorAll("video").forEach((v) => attach(v as HTMLVideoElement));
      // Drop overlays whose video left the page
      for (const o of overlays) {
        if (!o.video.isConnected) overlays.delete(o);
      }
    }

    // Players often cover the <video> with their own layers, so hit-test the pointer against
    // the video rectangles instead of relying on events fired by the video element itself.
    let moveQueued = false;
    document.addEventListener(
      "mousemove",
      (e) => {
        if (moveQueued) return;
        moveQueued = true;
        requestAnimationFrame(() => {
          moveQueued = false;
          for (const o of overlays) {
            const r = o.video.getBoundingClientRect();
            if (
              e.clientX >= r.left &&
              e.clientX <= r.right &&
              e.clientY >= r.top &&
              e.clientY <= r.bottom
            ) {
              o.activate();
            }
          }
        });
      },
      { passive: true }
    );

    const reposition = () => overlays.forEach((o) => o.update());
    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    window.addEventListener("resize", reposition, { passive: true });
    window.setInterval(reposition, 700);

    scan();
    new MutationObserver(scan).observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
});
