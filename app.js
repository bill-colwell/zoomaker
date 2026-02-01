import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";
import { renderBoard } from "./board-render.js";

// ---------- UI ----------
const statusEl = document.getElementById("status");
const boardEl = document.getElementById("board");
const logEl = document.getElementById("log");

const btnCreate = document.getElementById("createGame");
const btnJoin = document.getElementById("joinGame");
const joinInput = document.getElementById("gameCodeInput");

function log(msg) {
  if (!logEl) return;
  logEl.textContent = `${msg}\n` + logEl.textContent;
}

// ---------- Firebase ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let gameId = null;
let unsub = null;

// ---------- Helpers ----------
function makeGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function setButtonsEnabled(enabled) {
  if (btnCreate) btnCreate.disabled = !enabled;
  if (btnJoin) btnJoin.disabled = !enabled;
  if (joinInput) joinInput.disabled = !enabled;
}

// ---------- Game sync ----------
function watchGame(code) {
  if (unsub) unsub();
  gameId = code;

  const ref = doc(db, "games", gameId);
  unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      statusEl.textContent = `Game ${gameId} not found`;
      return;
    }

    const state = snap.data();
    statusEl.textContent = `Game ${gameId} • Players: ${state.players?.length || 0}`;
    log(`Synced game ${gameId}`);

    renderBoard(boardEl, state, async (tileId) => {
      // Click-to-move YOUR pawn (simple test mechanic)
      const myIndex = (state.players || []).findIndex(p => p.id === playerId);
      if (myIndex < 0) return;

      const players = [...state.players];
      players[myIndex] = { ...players[myIndex], tileId };

      await updateDoc(ref, { players });
      log(`Moved to tile ${tileId}`);
    });
  });
}

// ---------- Actions ----------
async function createGame() {
  const code = makeGameCode();
  const ref = doc(db, "games", code);

  const state = {
    createdAt: serverTimestamp(),
    version: 1,
    currentPlayerIndex: 0,
    turnNumber: 0,
    players: [
      { id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null }
    ]
  };

  await setDoc(ref, state);
  log(`Created game ${code}`);
  watchGame(code);
}

async function joinGame(code) {
  const clean = (code || "").toUpperCase().trim();
  if (!clean) {
    alert("Enter a game code first");
    return;
  }

  const ref = doc(db, "games", clean);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Game not found. Check the code.");
    return;
  }

  const state = snap.data();
  const players = state.players || [];
  const already = players.some(p => p.id === playerId);

  if (!already) {
    if (players.length >= 6) {
      alert("Game is full (max 6 players).");
      return;
    }
    players.push({ id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null });
    await updateDoc(ref, { players });
    log(`Joined game ${clean}`);
  } else {
    log(`Rejoined game ${clean}`);
  }

  watchGame(clean);
}

// ---------- Auth boot ----------
setButtonsEnabled(false);
statusEl.textContent = "Connecting…";

signInAnonymously(auth)
  .then((res) => {
    playerId = res.user.uid;
    statusEl.textContent = "Connected (anonymous)";
    log(`Signed in: ${playerId}`);
    setButtonsEnabled(true);

    // Wire buttons NOW that we’re authenticated
    if (btnCreate) btnCreate.addEventListener("click", createGame);
    if (btnJoin) btnJoin.addEventListener("click", () => joinGame(joinInput.value));

    // Render an empty local board if not in a game yet
    renderBoard(boardEl, { players: [{ id: playerId, tileId: 0 }] }, () => {});
  })
  .catch((err) => {
    statusEl.textContent = `Auth error: ${err.code}`;
    log(`AUTH ERROR: ${err.code} — ${err.message}`);
    console.error(err);
  });