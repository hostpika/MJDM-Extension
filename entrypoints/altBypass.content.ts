export default defineContentScript({
  matches: ["*://*/*"],
  registration: "runtime", // Registered only if user opts into Alt-bypass in settings
  main() {
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.altKey || e.key === "Alt") {
          if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
            browser.runtime.sendMessage({ type: "ALT_KEY_STATE", held: true }).catch(() => {});
          }
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "keyup",
      (e) => {
        if (!e.altKey && e.key === "Alt") {
          if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
            browser.runtime.sendMessage({ type: "ALT_KEY_STATE", held: false }).catch(() => {});
          }
        }
      },
      { passive: true }
    );
  },
});
