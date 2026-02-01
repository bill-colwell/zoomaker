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
import { renderBoard } from "./board-render-pickup.js";
import { TRACK_LENGTH, getSpace, ANIMALS } from "./board-data.js";

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
const moneyReadout = document.getElementById("moneyReadout");
const animalsReadout = document.getElementById("animalsReadout");

const eventTitle = document.getElementById("eventTitle");
const eventBody = document.getElementById("eventBody");
const eventBox = document.getElementById("eventBox");
const btnBuy = document.getElementById("buyAnimal");
const btnSkip = document.getElementById("skipAnimal");

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

function setOfferButtons(enabled) {
  btnBuy.disabled = !enabled;
  btnSkip.disabled = !enabled;
}

function makeGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function currentTurnPlayer(state) {
  const players = state.players || [];
  return players[state.turnIndex || 0] || null;
}

function myPlayer(state){
  return (state.players || []).find(p => p.id === playerId) || null;
}

function setEvent(title, body){
  eventTitle.textContent = title || "—";
  eventBody.textContent = body || "—";
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
    const me = myPlayer(state);

    statusEl.textContent = `Game ${gameId} • Players: ${players.length}`;
    turnReadout.textContent = turnP ? (turnP.id === playerId ? "Your turn" : "Other player") : "—";
    diceReadout.textContent = state.lastDice ? `${state.lastDice.d1} + ${state.lastDice.d2} = ${state.lastDice.total}` : "—";

    if (me) {
      moneyReadout.textContent = me.money ?? 0;
      animalsReadout.textContent = me.animals ?? 0;
    } else {
      moneyReadout.textContent = "—";
      animalsReadout.textContent = "—";
    }

    // show last event
    if (state.lastEvent?.title) {
      setEvent(state.lastEvent.title, state.lastEvent.body);
    }

    // offer UI
    const offer = state.pendingOffer || null;
    const offerForMe = offer && offer.forPlayerId === playerId;
    const isMyTurn = turnP && turnP.id === playerId;

    if (offerForMe && isMyTurn) {
      setOfferButtons(true);
      btnRoll.disabled = true; // must resolve offer first
      setEvent("Animal Market Offer",
        `Buy a ${offer.animal.name} for $${offer.animal.cost}? (Tier +${offer.animal.tier})`);
    } else {
      setOfferButtons(false);
      // roll button is enabled only if in game & your turn
      btnRoll.disabled = !(isMyTurn && !offer);
    }

    renderBoard(boardEl, state, async () => {
      // clicking spaces is disabled for gameplay now (dice controls movement)
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
    version: 3,
    players: [{ id: playerId, pos: 0, money: 1500, animals: 0, tierPoints: 0 }],
    turnIndex: 0,
    lastDice: null,
    lastEvent: { title: "Welcome to Zoomaker!", body: "Roll dice to start building your zoo." },
    pendingOffer: null
  };

  await setDoc(ref, state);
  joinInput.value = code;
  log(`Created game ${code}`);
  watchGame(code);
}

async function joinGame() {
  const code = (joinInput.value || "").trim().toUpperCase();
  if (!code) { alert("Enter a game code."); return; }

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) { alert("Game not found."); return; }

  const state = snap.data();
  const players = [...(state.players || [])];

  if (!players.some(p => p.id === playerId)) {
    if (players.length >= 6) { alert("Game full (max 6)."); return; }
    players.push({ id: playerId, pos: 0, money: 1500, animals: 0, tierPoints: 0 });
    await updateDoc(ref, { players });
    log(`Joined game ${code}`);
  } else {
    log(`Rejoined game ${code}`);
  }

  watchGame(code);
}

function pickAnimalOffer(rng){
  // rng is integer 0..(ANIMALS.length-1)
  return ANIMALS[rng % ANIMALS.length];
}

async function rollDice() {
  if (!gameId) { alert("Create or join a game first."); return; }
  const ref = doc(db, "games", gameId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const state = snap.data();
    const players = [...(state.players || [])];
    if (players.length === 0) return;

    const turnP = currentTurnPlayer(state);
    if (!turnP || turnP.id !== playerId) return;

    if (state.pendingOffer) return; // must resolve offer first

    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    const idx = players.findIndex(p => p.id === playerId);
    const cur = Number.isInteger(players[idx].pos) ? players[idx].pos : 0;
    const next = (cur + total) % TRACK_LENGTH;

    players[idx] = { ...players[idx], pos: next };

    const space = getSpace(next);

    // Default event outcome
    let lastEvent = { title: `Landed on: ${space.name}`, body: `Space ${next} • ${space.type}` };
    let pendingOffer = null;
    let turnIndex = state.turnIndex || 0;

    // Apply space effects
    if (space.type === "TIP") {
      const amt = space.data.amount || 50;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) + amt };
      lastEvent = { title: "Tip Jar!", body: `Visitors tipped you $${amt}.` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    else if (space.type === "VET") {
      const amt = space.data.amount || 120;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = { title: "Vet Clinic", body: `Animal checkup: Pay $${amt}.` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    else if (space.type === "RUNAWAY") {
      const amt = space.data.amount || 150;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = { title: "Runaway!", body: `Hire a capture crew: Pay $${amt}.` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    else if (space.type === "ACCIDENT") {
      const amt = space.data.amount || 200;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = { title: "Zoo Accident", body: `Repairs & liability: Pay $${amt}.` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    else if (space.type === "DONATION") {
      const amt = space.data.amountFromEach || 50;
      // everyone pays active player (including active pays 0)
      let gained = 0;
      for (let p = 0; p < players.length; p++) {
        if (p === idx) continue;
        players[p] = { ...players[p], money: (players[p].money || 0) - amt };
        gained += amt;
      }
      players[idx] = { ...players[idx], money: (players[idx].money || 0) + gained };
      lastEvent = { title: "Donation Day!", body: `Each other player pays you $${amt} (you gained $${gained}).` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    else if (space.type === "MARKET") {
      // create an offer; do NOT advance turn until resolved
      const rng = Math.floor(Math.random() * 1000000);
      const animal = pickAnimalOffer(rng);
      pendingOffer = { forPlayerId: playerId, animal, createdAt: Date.now() };
      lastEvent = { title: "Animal Market", body: `Offer available: ${animal.name} for $${animal.cost} (Tier +${animal.tier}).` };
    }

    else {
      // PATH/HOME do nothing, advance turn
      lastEvent = { title: space.name, body: `Nothing special happened. Next player!` };
      turnIndex = (turnIndex + 1) % players.length;
    }

    tx.update(ref, {
      players,
      turnIndex,
      pendingOffer,
      lastEvent,
      lastDice: { d1, d2, total, by: playerId }
    });
  });

  log("Rolled dice");
}

async function resolveOffer(buy) {
  if (!gameId) return;
  const ref = doc(db, "games", gameId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const state = snap.data();
    const offer = state.pendingOffer;
    if (!offer || offer.forPlayerId !== playerId) return;

    const players = [...(state.players || [])];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx < 0) return;

    const animal = offer.animal;
    let lastEvent;

    if (buy) {
      const money = players[idx].money || 0;
      if (money < animal.cost) {
        lastEvent = { title: "Not enough money", body: `You need $${animal.cost} to buy ${animal.name}.` };
      } else {
        players[idx] = {
          ...players[idx],
          money: money - animal.cost,
          animals: (players[idx].animals || 0) + 1,
          tierPoints: (players[idx].tierPoints || 0) + (animal.tier || 1)
        };
        lastEvent = { title: "Animal Purchased!", body: `You bought a ${animal.name} for $${animal.cost}.` };
      }
    } else {
      lastEvent = { title: "Skipped Purchase", body: `You passed on the ${animal.name}.` };
    }

    const nextTurn = ((state.turnIndex || 0) + 1) % players.length;

    tx.update(ref, {
      players,
      pendingOffer: null,
      lastEvent,
      turnIndex: nextTurn
    });
  });

  log(buy ? "Bought animal" : "Skipped animal");
}

// boot
statusEl.textContent = "Signing in…";
setEnabled(false);
setOfferButtons(false);

setEvent("Zoomaker", "Sign in…");

signInAnonymously(auth)
  .then((res) => {
    playerId = res.user.uid;
    statusEl.textContent = "Connected (anonymous) • Ready";
    log("Signed in ✅");
    setEnabled(true);

    btnCreate.onclick = () => createGame().catch(e => log("CREATE ERROR: " + e.message));
    btnJoin.onclick = () => joinGame().catch(e => log("JOIN ERROR: " + e.message));
    btnRoll.onclick = () => rollDice().catch(e => log("DICE ERROR: " + e.message));

    btnBuy.onclick = () => resolveOffer(true).catch(e => log("BUY ERROR: " + e.message));
    btnSkip.onclick = () => resolveOffer(false).catch(e => log("SKIP ERROR: " + e.message));
  })
  .catch((err) => {
    statusEl.textContent = `Auth error: ${err.code}`;
    log(`AUTH ERROR: ${err.code} — ${err.message}`);
    setEvent("Auth error", `${err.code}`);
  });
