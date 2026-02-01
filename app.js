const VERSION = "IMPORT-TEST-01";

const statusEl = document.getElementById("status");
const boardEl = document.getElementById("board");
const logEl = document.getElementById("log");

function log(msg) {
  if (logEl) logEl.textContent = msg + "\n" + logEl.textContent;
}

statusEl.textContent = `Running ${VERSION}`;
log(`✅ app.js loaded: ${VERSION}`);
log(`boardEl exists: ${!!boardEl}`);
log(`logEl exists: ${!!logEl}`);

window.addEventListener("error", (e) => log(`❌ JS ERROR: ${e.message}`));
window.addEventListener("unhandledrejection", (e) => log(`❌ PROMISE ERROR: ${e.reason?.message || e.reason}`));

// 1) Always show something in #board
boardEl.innerHTML = `
  <div style="padding:12px;border:1px dashed #88a;border-radius:8px">
    <b>Sanity render OK.</b> Now attempting module imports…
  </div>
`;

(async () => {
  try {
    log("Attempting import: ./board-render.js");
    const { renderBoard } = await import("./board-render.js");
    log("✅ Imported board-render.js");

    log("Attempting import: ./board-data.js");
    await import("./board-data.js");
    log("✅ Imported board-data.js");

    const state = { players: [{ id: "you", tileId: 0 }] };
    renderBoard(boardEl, state, (tileId) => {
      state.players[0].tileId = tileId;
      renderBoard(boardEl, state, () => {});
      log(`Clicked tile ${tileId}`);
    });

    log("✅ renderBoard called successfully");
    statusEl.textContent = `Board rendered (${VERSION})`;
  } catch (e) {
    log(`❌ IMPORT/RENDER FAILED: ${e.message}`);
    statusEl.textContent = `Failed (${VERSION})`;
  }
})();
