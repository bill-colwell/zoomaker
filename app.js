import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";
import { renderBoard } from "./board-render.js";

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const boardEl = document.getElementById("board");
const btnCreate = document.getElementById("createGame");

function log(msg){ logEl.textContent = msg + "\n" + logEl.textContent; }

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let playerId = null;
let gameId = null;

signInAnonymously(auth).then(res=>{
  playerId = res.user.uid;
  statusEl.textContent = "Connected";
  log("Signed in");

  btnCreate.onclick = createGame;
}).catch(err=>{
  statusEl.textContent = err.code;
});

function createGame(){
  gameId = Math.random().toString(36).substring(2,6).toUpperCase();
  log("Create clicked → " + gameId);

  const ref = doc(db,"games",gameId);
  setDoc(ref,{
    players:[{id:playerId,tileId:0}]
  });

  onSnapshot(ref,snap=>{
    const state = snap.data();
    renderBoard(boardEl,state,(tile)=>{
      state.players[0].tileId = tile;
      setDoc(ref,state);
    });
  });
}