import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";
import { renderBoard } from "./board-render.js";
import { TRACK_LENGTH } from "./board-data.js";

// UI
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const boardEl = document.getElementById("board");

const btnCreate = document.getElementById("createGame");
const btnJoin = document.getElementById("joinGame");
const joinInput = document.getElementById("gameCodeInput");

const btnRoll = document.getElementById("rollDice");
const diceReadout = document.getElementById("diceReadout");
const turnReadout = document.getElementById("turnReadout");

function log(msg) {
  if (!logEl) return;
  logEl.textContent = msg + "\n" + logEl.textContent;
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let gameId = null;
let unsub = null;
let lastState = null;

function setEnabled(on) {
  btnCreate.disabled = !on;
  btnJoin.disabled = !on;
  joinInput.disabled = !on;
  btnRoll.disabled = !on;
}

function makeGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function currentTurnPlayer(state) {
  const players = state.players || [];
  const idx = state.turnIndex || 0;
  return players[idx] || null;
}

function watchGame(id) {
  if (unsub) unsub();
  gameId = id;

  const ref = doc(db, "games", gameId);

  unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      statusEl.textContent = `Game ${gameId} not found`;
      return;
    }

    const state = snap.data();
    lastState = state;

    const players = state.players || [];
    const turnP = currentTurnPlayer(state);

    statusEl.textContent = `Connected • Game ${gameId} • Players: ${players.length}`;
    turnReadout.textContent = turnP ? (turnP.id === playerId ? "Your turn" : "Other player") : "—";
    diceReadout.textContent = state.lastDice ? `${state.lastDice.d1} + ${state.lastDice.d2} = ${state.lastDice.total}` : "—";

    renderBoard(boardEl, state, async (spaceId) => {
      // Optional click-to-move (debug): only allow on your turn
      if (!turnP || turnP.id !== playerId) return;
      await movePlayerTo(spaceId);
    });
  });

  log(`Watching game ${gameId}`);
}

async function createGame() {
  let code = makeGameCode();
  for (let tries = 0; tries < 8; tries++) {
    const exists = await getDoc(doc(db, "games", code));
    if (!exists.exists()) break;
    code = makeGameCode();
  }

  const ref = doc(db, "games", code);

  const state = {
    createdAt: serverTimestamp(),
    version: 2,
    players: [{ id: playerId, pos: 0, money: 1500 }],
    turnIndex: 0,
    lastDice: null
  };

  await setDoc(ref, state);
  joinInput.value = code;
  log(`Created game ${code}`);
  watchGame(code);
}

async function joinGame() {
  const code = (joinInput.value || "").trim().toUpperCase();
  if (!code) {
    alert("Enter a game code.");
    return;
  }

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Game not found.");
    return;
  }

  const state = snap.data();
  const players = [...(state.players || [])];

  if (!players.some(p => p.id === playerId)) {
    if (players.length >= 6) {
      alert("Game full (max 6).");
      return;
    }
    players.push({ id: playerId, pos: 0, money: 1500 });
    await updateDoc(ref, { players });
    log(`Joined game ${code}`);
  } else {
    log(`Rejoined game ${code}`);
  }

  watchGame(code);
}

async function movePlayerTo(spaceId) {
  if (!gameId) return;
  const ref = doc(db, "games", gameId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const state = snap.data();
    const players = [...(state.players || [])];
    const turnP = currentTurnPlayer(state);
    if (!turnP || turnP.id !== playerId) return;

    const idx = players.findIndex(p => p.id === playerId);
    if (idx < 0) return;

    players[idx] = { ...players[idx], pos: spaceId };
    tx.update(ref, { players });
  });

  log(`Moved to space ${spaceId}`);
}

async function rollDice() {
  if (!gameId) {
    alert("Create or join a game first.");
    return;
  }

  const ref = doc(db, "games", gameId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const state = snap.data();
    const players = [...(state.players || [])];
    if (players.length === 0) return;

    const turnP = currentTurnPlayer(state);
    if (!turnP || turnP.id !== playerId) {
      // Not your turn
      return;
    }

    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    const idx = players.findIndex(p => p.id === playerId);
    const cur = Number.isInteger(players[idx].pos) ? players[idx].pos : 0;
    const next = (cur + total) % TRACK_LENGTH;

    players[idx] = { ...players[idx], pos: next };

    // advance turn
    const nextTurn = (state.turnIndex + 1) % players.length;

    tx.update(ref, {
      players,
      turnIndex: nextTurn,
      lastDice: { d1, d2, total, by: playerId }
    });
  });

  log("Rolled dice");
}

// boot
statusEl.textContent = "Signing in…";
setEnabled(false);

// show placeholder board before game
renderBoard(boardEl, { players: [{ id: "idle", pos: 0 }] }, () => {});

signInAnonymously(auth)
  .then((res) => {
    playerId = res.user.uid;
    statusEl.textContent = "Connected (anonymous) • Ready";
    log("Signed in ✅");
    setEnabled(true);

    btnCreate.onclick = () => createGame().catch(e => log("CREATE ERROR: " + e.message));
    btnJoin.onclick = () => joinGame().catch(e => log("JOIN ERROR: " + e.message));
    btnRoll.onclick = () => rollDice().catch(e => log("DICE ERROR: " + e.message));
  })
  .catch((err) => {
    statusEl.textContent = `Auth error: ${err.code}`;
    log(`AUTH ERROR: ${err.code} — ${err.message}`);
  });
