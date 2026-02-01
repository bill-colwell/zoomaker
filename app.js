// app.js

// --- Firebase imports (ALL same version) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { BOARD } from "./board-data.js";
import { renderBoard } from "./board-render.js";

// --- Local config ---
import { firebaseConfig } from "./firebase-config.js";

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Status helper ---
const statusEl = document.getElementById("status");

// --- Anonymous Auth ---
signInAnonymously(auth)
  .then((result) => {
    console.log("Signed in anonymously:", result.user.uid);
    statusEl.textContent = "Connected (anonymous)";
  })
  .catch((error) => {
    console.error("Auth error:", error);
    statusEl.textContent = `Auth error: ${error.code} ${error.message}`;
  });

// ------------------------------------------------------------------
// Everything below here is SAFE UI scaffolding (no game logic yet)
// ------------------------------------------------------------------

const createBtn = document.getElementById("createGame");
const joinBtn = document.getElementById("joinGame");
const gameCodeInput = document.getElementById("gameCodeInput");
const boardEl = document.getElementById("board");

// Minimal local state just to prove rendering
const state = {
  players: [{ id: "you", tileId: 0 }],
  pendingChoices: []
};

renderBoard(boardEl, state, (tileId) => {
  console.log("Clicked tile", tileId);
});



if (createBtn) {
  createBtn.addEventListener("click", () => {
    alert("Create Game clicked (Firestore logic comes next)");
  });
}

if (joinBtn) {
  joinBtn.addEventListener("click", () => {
    const code = gameCodeInput.value.trim();
    if (!code) {
      alert("Enter a game code first");
      return;
    }
    alert(`Join Game clicked with code: ${code}`);
  });
}