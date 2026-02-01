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
const logEl = document.getElementById("log");
const boardEl = document.getElementById("board");

const btnCreate = document.getElementById("createGame");
const btnJoin = document.getElementById("joinGame");
const joinInput = document.getElementById("gameCodeInput");

function log(msg) {
  if (!logEl) return;
  logEl.textContent = msg + "\n" + logEl.textContent;
}

// ---------- Firebase ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let currentGameId = null;
let unsubscribe = null;

// ---------- Helpers ----------
function makeGameCode() {
  // readable code (no O/0, I/1 confusion)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function setButtonsEnabled(enabled) {
  btnCreate.disabled = !enabled;
  btnJoin.disabled = !enabled;
  joinInput.disabled = !enabled;
}

// Render something even before game exists (optional)
function renderIdleBoard() {
  renderBoard(boardEl, { players: [{ id: "idle", tileId: 0 }] }, () => {});
}

// ---------- Game sync ----------
function watchGame(gameId) {
  if (unsubscribe) unsubscribe();
  currentGameId = gameId;

  const ref = doc(db, "games", currentGameId);

  unsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      statusEl.textContent = `Game ${currentGameId} not found`;
      log(`Game ${currentGameId} not found`);
      return;
    }

    const state = snap.data();
    statusEl.textContent = `Connected • Game ${currentGameId} • Players: ${(state.players || []).length}`;

    // Render board from Firestore state ONLY
    renderBoard(boardEl, state, async (tileId) => {
      // Move ONLY your pawn
      const players = [...(state.players || [])];
      const idx = players.findIndex(p => p.id === playerId);
      if (idx < 0) return;

      players[idx] = { ...players[idx], tileId };
      await updateDoc(ref, { players });
      log(`Moved to tile ${tileId}`);
    });
  });

  log(`Watching game ${currentGameId}`);
}

// ---------- Actions ----------
async function createGame() {
  // Generate a code and ensure it doesn't already exist (simple retry)
  let code = makeGameCode();
  for (let tries = 0; tries < 5; tries++) {
    const existing = await getDoc(doc(db, "games", code));
    if (!existing.exists()) break;
    code = makeGameCode();
  }

  const ref = doc(db, "games", code);

  const newState = {
    createdAt: serverTimestamp(),
    version: 1,
    players: [
      { id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null }
    ]
  };

  await setDoc(ref, newState);
  joinInput.value = code; // show it in the input box
  log(`Created game: ${code}`);
  watchGame(code);
}

async function joinGame() {
  const code = (joinInput.value || "").trim().toUpperCase();
  if (!code) {
    alert("Enter a game code first.");
    return;
  }

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Game not found. Check the code.");
    return;
  }

  const state = snap.data();
  const players = [...(state.players || [])];

  if (!players.some(p => p.id === playerId)) {
    if (players.length >= 6) {
      alert("Game is full (max 6 players).");
      return;
    }
    players.push({ id: playerId, tileId: 0, money: 1500, tierPoints: 0, carrying: null });
    await updateDoc(ref, { players });
    log(`Joined game: ${code}`);
  } else {
    log(`Rejoined game: ${code}`);
  }

  watchGame(code);
}

// ---------- Boot ----------
statusEl.textContent = "Signing in…";
setButtonsEnabled(false);
renderIdleBoard();

signInAnonymously(auth)
  .then((res) => {
    playerId = res.user.uid;
    statusEl.textContent = "Connected (anonymous) • Ready";
    log("Signed in ✅");

    setButtonsEnabled(true);

    btnCreate.onclick = () => createGame().catch(e => log("CREATE ERROR: " + e.message));
    btnJoin.onclick = () => joinGame().catch(e => log("JOIN ERROR: " + e.message));
  })
  .catch((err) => {
    statusEl.textContent = `Auth error: ${err.code}`;
    log(`AUTH ERROR: ${err.code} — ${err.message}`);
  });
