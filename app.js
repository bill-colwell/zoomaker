import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- Minimal deterministic RNG ----------
function splitmix64(seed) {
  let state = BigInt(seed);
  return () => {
    state = (state + 0x9E3779B97F4A7C15n) & ((1n << 64n) - 1n);
    let z = state;
    z = (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n & ((1n<<64n)-1n);
    z = (z ^ (z >> 27n)) * 0x94D049BB133111EBn & ((1n<<64n)-1n);
    z = z ^ (z >> 31n);
    return z;
  };
}

function rollDie(next64) {
  return Number(next64() % 6n) + 1;
}

function rollTwoDice(next64) {
  return rollDie(next64) + rollDie(next64);
}

// ---------- Firebase init ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

signInAnonymously(auth)
  .then(() => {
    document.getElementById("status").textContent = "Connected (anonymous)";
  })
  .catch((error) => {
    console.error("Auth error:", error);
    document.getElementById("status").textContent = "Auth error";
  });

// ---------- UI ----------
const el = (id) => document.getElementById(id);
const logEl = el("log");
const setStatus = (t) => (el("status").textContent = t);

let playerId = null;
let gameId = null;
let unsub = null;

function log(msg) {
  logEl.textContent = (msg + "\n" + logEl.textContent).slice(0, 2000);
}

function updateUI(state) {
  if (!state) return;

  el("gameCode").textContent = gameId ?? "—";
  el("playerId").textContent = playerId ?? "—";
  el("turnPlayer").textContent = state.players[state.currentPlayerIndex]?.id ?? "—";
  el("turnNum").textContent = state.turnNumber ?? 0;

  const me = state.players.find(p => p.id === playerId);
  el("money").textContent = me?.money ?? "—";
  el("tiers").textContent = me?.tierPoints ?? "—";
  el("tile").textContent = me?.tile ?? "—";
  el("carrying").textContent = me?.carrying ?? "None";

  const isMyTurn = (state.players[state.currentPlayerIndex]?.id === playerId);
  el("btnRoll").disabled = !isMyTurn || state.winnerId;
}

// ---------- Auth ----------
async function ensureAuth() {
  const res = await signInAnonymously(auth);
  playerId = res.user.uid;
  setStatus("Connected as anonymous player");
}

// ---------- Game creation ----------
function makeGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createGame() {
  gameId = makeGameCode();
  const ref = doc(db, "games", gameId);

  const seed = Date.now(); // seed saved in game state, not local
  const state = {
    version: 1,
    createdAt: serverTimestamp(),
    turnNumber: 0,
    currentPlayerIndex: 0,
    rngSeed: seed,
    winnerId: null,
    players: [
      { id: playerId, money: 1500, tierPoints: 0, tile: "START", carrying: null }
    ],
    lastRoll: null,
    log: [`Game created by ${playerId}`]
  };

  await setDoc(ref, state);
  log(`Created game ${gameId}. Share this code.`);
  watchGame();
}

async function joinGame(code) {
  gameId = code.toUpperCase().trim();
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    log("Game not found. Check code.");
    return;
  }

  const state = snap.data();
  const exists = state.players.some(p => p.id === playerId);
  if (!exists) {
    if (state.players.length >= 6) {
      log("Game is full.");
      return;
    }
    state.players.push({ id: playerId, money: 1500, tierPoints: 0, tile: "START", carrying: null });
    state.log = (state.log ?? []).concat([`${playerId} joined`]);
    await updateDoc(ref, { players: state.players, log: state.log });
  }

  log(`Joined game ${gameId}`);
  watchGame();
}

function watchGame() {
  if (unsub) unsub();
  const ref = doc(db, "games", gameId);
  unsub = onSnapshot(ref, (snap) => {
    const state = snap.data();
    updateUI(state);
    const newest = (state.log ?? [])[state.log.length - 1];
    if (newest) setStatus(`Game ${gameId} • ${newest}`);
  });
}

// ---------- Turn action: roll dice ----------
async function rollAction() {
  if (!gameId) return;
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  const state = snap.data();

  const currentId = state.players[state.currentPlayerIndex]?.id;
  if (currentId !== playerId) {
    log("Not your turn.");
    return;
  }

  // deterministic roll based on stored seed + turnNumber
  const next64 = splitmix64(BigInt(state.rngSeed) + BigInt(state.turnNumber));
  const roll = rollTwoDice(next64);

  // For v1 starter: just award money on roll so you can test turns
  const meIndex = state.players.findIndex(p => p.id === playerId);
  state.players[meIndex].money += 10 * roll;
  state.lastRoll = roll;

  // advance turn
  state.turnNumber += 1;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.log = (state.log ?? []).concat([`${playerId} rolled ${roll} (+$${10 * roll})`]);

  await updateDoc(ref, {
    players: state.players,
    lastRoll: state.lastRoll,
    turnNumber: state.turnNumber,
    currentPlayerIndex: state.currentPlayerIndex,
    log: state.log
  });

  el("rollResult").textContent = String(roll);
  log(`You rolled ${roll}`);
}

// ---------- Wire UI ----------
await ensureAuth();

el("btnCreate").addEventListener("click", createGame);
el("btnJoin").addEventListener("click", () => joinGame(el("joinCode").value));
el("btnRoll").addEventListener("click", rollAction);