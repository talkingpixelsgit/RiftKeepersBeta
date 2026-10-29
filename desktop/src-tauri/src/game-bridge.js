// Runs at the top of every page in the game window. On the game's own pages it adds the
// desktop keys; the app's pages handle their own.
(() => {
  if (location.protocol === "tauri:" || location.hostname === "tauri.localhost") return;
  const invoke = (cmd, args) => {
    const ipc = window.__TAURI_INTERNALS__;
    return ipc ? ipc.invoke(cmd, args).catch(() => {}) : Promise.resolve();
  };
  addEventListener("keydown", (e) => {
    if (e.key === "F11" && !e.repeat) {
      e.preventDefault();
      invoke("toggle_fullscreen");
    } else if (e.ctrlKey && e.shiftKey && e.code === "KeyH") {
      e.preventDefault();
      invoke("go_home");
    }
  }, true);
  // The game's Fullscreen button fills the web view; make the window follow it.
  document.addEventListener("fullscreenchange", () => {
    invoke("set_fullscreen", { on: !!document.fullscreenElement });
  });
})();
