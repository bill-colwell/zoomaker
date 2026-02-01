// app.js (debug + create/join + board render)
// Version tag to prove your deployed file updated:
const VERSION = "v-debug-2026-01-31-1";

function $(sel) { return document.querySelector(sel); }
const statusEl = $("#status");
const logEl = $("#log");
const boardEl = $("#board");

// Try multiple possible IDs so we don't get stuck on naming mismatches:
const btnCreate = $("#createGame") || $("#newGame") || $("button#create") || $("button[data-action='create']");
const btnJoin   = $("#joinGame") || $("#join") || $("button[data-action='join']");
const joinInput = $("#gameCodeInput") || $("#joinCode") || $("#joinCodeInput") || $("input[data-action='code']");

function log(msg) {
  if (logEl) logEl.textContent = `${msg}\n` + logEl.textContent;
}

// Show errors on-screen (iPad-friendly)
window.addEventListener("error", (e) => log(`JS ERROR: ${e.message}`));
window.addEventListener("unhandledrejection", (e) => log(`PROMISE ERROR: ${e.reason?.message || e.reason}`));

if (statusEl) statusEl.textContent = `APP LOADED ${VERSION}`;
log(`Loaded ${VERSION}`);
log(`Found btnCreate: ${!!btnCreate}, btnJoin: ${!!btnJoin}, joinInput: ${!!joinInput}`);
if (!btnCreate) log("Create button NOT found. Check index.html button id.");
if (!logEl) alert("Missing <pre id='log'> in index.html (needed for debug).");

// ---- Imports (wrapped so failures show in log) ----
let initializeApp, getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp, getAuth, signInAnonymously;
let firebaseConfig, renderBoard;

try {
  ({ initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"));
  ({ getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"));
  ({ getAuth, signInAnonymously } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"));

  ({ firebaseConfig } = await import("./firebase-config.js"));
  ({ renderBoard } = await import("./board-render.js"));

  log("All modules imported OK ✅");
} catch (e) {
  log(`IMPORT FAILED: ${e.message}`);
  throw e;
}

// ---- Firebase init ----
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let gameId = null;
let unsub = null;

function makeGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function watchGame(code) {
  if (unsub) unsub();
  gameId = code;
  const ref = doc(db, "games", gameId);

  unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      statusEl.textContent = `Game ${gameId} missing`;
      log(`Game doc missing: ${gameId}`);
      return;
    }
    const state = snap.data();
    statusEl.textContent = `Game ${gameId} • Players: ${(state.players || []).length}`;
    renderBoard(boardEl, state, async (tileId) => {
      const myIndex = (state.players || []).findIndex(p => p.id === playerId);
      if (myIndex < 0) return;

      const players = [...state.players];
      players[myIndex] = { ...players[myIndex], tileId };
      await updateDoc(ref, { players });
      log(`Moved to tile ${tileId}`);
    });
  });
}

async function createGame() {
  log("Create clicked ✅ (handler ran)");
  const code = makeGameCode();
  const ref = doc(db, "games", code);

  const state = {
    createdAt: serverTimestamp(),
    version: 1,
    players: [{ id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null }],
    currentPlayerIndex: 0,
    turnNumber: 0
  };

  await setDoc(ref, state);
  log(`Created game ${code}`);
  watchGame(code);
}

async function joinGame() {
  log("Join clicked ✅ (handler ran)");
  const code = (joinInput?.value || "").toUpperCase().trim();
  if (!code) { alert("Enter a game code"); return; }

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) { alert("Game not found"); return; }

  const state = snap.data();
  const players = state.players || [];
  if (!players.some(p => p.id === playerId)) {
    if (players.length >= 6) { alert("Game full"); return; }
    players.push({ id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null });
    await updateDoc(ref, { players });
    log(`Joined game ${code}`);
  } else {
    log(`Rejoined game ${code}`);
  }
  watchGame(code);
}

// Wire clicks *immediately* (even before auth) so we can tell if the button is found
if (btnCreate) btnCreate.addEventListener("click", () => log("Create button pressed (pre-auth)"));
if (btnJoin) btnJoin.addEventListener("click", () => log("Join button pressed (pre-auth)"));

// ---- Auth ----
statusEl.textContent = `Signing in… ${VERSION}`;
signInAnonymously(auth)
  .then((res) => {
    playerId = res.user.uid;
    statusEl.textContent = `Connected (anonymous) ${VERSION}`;
    log(`Signed in: ${playerId}`);

    // Now wire real actions
    if (btnCreate) {
      btnCreate.onclick = () => createGame().catch(e => log(`CREATE FAILED: ${e.message}`));
      log("Create handler attached ✅");
    }
    if (btnJoin) {
      btnJoin.onclick = () => joinGame().catch(e => log(`JOIN FAILED: ${e.message}`));
      log("Join handler attached ✅");
    }

    // Render local board even before a game exists
    renderBoard(boardEl, { players: [{ id: playerId, tileId: 0 }] }, () => {});
  })
  .catch((err) => {
    statusEl.textContent = `Auth error: ${err.code}`;
    log(`AUTH ERROR: ${err.code} — ${err.message}`);
  });