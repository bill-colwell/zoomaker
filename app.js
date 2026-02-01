import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";
import { renderBoard } from "./board-render.js";

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const boardEl = document.getElementById("board");
const btnCreate = document.getElementById("createGame");

function log(msg) {
  if (!logEl) return;
  logEl.textContent = msg + "\n" + logEl.textContent;
}

statusEl.textContent = "app.js running…";
log("app.js loaded ✅");
log("Create button found: " + (!!btnCreate));
log("Board div found: " + (!!boardEl));

// Firebase init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let gameId = null;

// Render a LOCAL board immediately (proves board-render works)
const localState = { players: [{ id: "local", tileId: 0 }] };
try {
  renderBoard(boardEl, localState, (tile) => {
    localState.players[0].tileId = tile;
    renderBoard(boardEl, localState, () => {});
    log("Local click tile: " + tile);
  });
  log("Local board rendered ✅");
} catch (e) {
  log("BOARD RENDER ERROR: " + e.message);
}

// Auth
signInAnonymously(auth)
  .then(res => {
    playerId = res.user.uid;
    statusEl.textContent = "Connected (anonymous)";
    log("Signed in ✅ uid=" + playerId);

    if (btnCreate) {
      btnCreate.onclick = createGame;
      log("Create handler attached ✅");
    } else {
      log("ERROR: createGame button not found (id must be createGame)");
    }
  })
  .catch(err => {
    statusEl.textContent = "Auth error: " + err.code;
    log("AUTH ERROR: " + err.code + " — " + err.message);
  });

function createGame() {
  gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
  log("Create clicked ✅ code=" + gameId);

  const ref = doc(db, "games", gameId);
  setDoc(ref, { players: [{ id: playerId, tileId: 0 }] });

  onSnapshot(ref, snap => {
    if (!snap.exists()) {
      log("Snapshot: game doc missing");
      return;
    }
    const state = snap.data();
    log("Snapshot: received state ✅ players=" + (state.players?.length || 0));

    renderBoard(boardEl, state, (tile) => {
      // Move ONLY your pawn in multiplayer-safe way
      const players = [...(state.players || [])];
      const idx = players.findIndex(p => p.id === playerId);
      if (idx < 0) return;

      players[idx] = { ...players[idx], tileId: tile };
      setDoc(ref, { players });
      log("Moved to tile " + tile);
    });
  });
}
