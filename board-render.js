import { TRACK_LENGTH } from "./board-data.js";

// Renderer build stamp (so you know you’re on the right file)
const RENDER_VERSION = "SAFE-PICKUP-1";

// Colors for up to 6 players
const BODY_COLORS = ["#ff3b3b", "#ff9f1a", "#34c759", "#32ade6", "#af52de", "#ffd60a"];
const CAB_COLORS  = ["#ff6b6b", "#ffc266", "#6eea94", "#7ad7ff", "#d7a6ff", "#fff2a8"];

function trackToXY(i) {
  let x, y;
  if (i <= 9) { x = i; y = 0; }
  else if (i <= 14) { x = 9; y = i - 9; }
  else if (i <= 24) { x = 24 - i; y = 5; }
  else { x = 0; y = 29 - i; }

  const px = 55 + x * 55;
  const py = 60 + y * 55;
  return [px, py];
}

function shortType(type) {
  // tolerate undefined
  if (!type) return "";
  switch (type) {
    case "HOME":
    case "MARKET":
    case "VET":
    case "RUNAWAY":
    case "ACCIDENT":
    case "TIP":
    case "DONATION":
      return type;
    default:
      return "";
  }
}

function drawPickup(svg, svgNS, x, y, bodyColor, cabColor) {
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("transform", `translate(${x}, ${y})`);

  // Bed (short, blocky)
  const bed = document.createElementNS(svgNS, "rect");
  bed.setAttribute("x", -18);
  bed.setAttribute("y", 0);
  bed.setAttribute("width", 14);
  bed.setAttribute("height", 8);
  bed.setAttribute("rx", 2);
  bed.setAttribute("fill", bodyColor);

  // Cab
  const cab = document.createElementNS(svgNS, "rect");
  cab.setAttribute("x", -4);
  cab.setAttribute("y", -6);
  cab.setAttribute("width", 16);
  cab.setAttribute("height", 14);
  cab.setAttribute("rx", 3);
  cab.setAttribute("fill", cabColor);

  // Hood
  const hood = document.createElementNS(svgNS, "rect");
  hood.setAttribute("x", 12);
  hood.setAttribute("y", 0);
  hood.setAttribute("width", 10);
  hood.setAttribute("height", 8);
  hood.setAttribute("rx", 2);
  hood.setAttribute("fill", bodyColor);

  // Window
  const win = document.createElementNS(svgNS, "rect");
  win.setAttribute("x", -2);
  win.setAttribute("y", -4);
  win.setAttribute("width", 8);
  win.setAttribute("height", 5);
  win.setAttribute("rx", 1);
  win.setAttribute("fill", "#d9ecff");

  // Wheels
  const w1 = document.createElementNS(svgNS, "circle");
  w1.setAttribute("cx", -10);
  w1.setAttribute("cy", 10);
  w1.setAttribute("r", 4);
  w1.setAttribute("fill", "#111");

  const w2 = document.createElementNS(svgNS, "circle");
  w2.setAttribute("cx", 12);
  w2.setAttribute("cy", 10);
  w2.setAttribute("r", 4);
  w2.setAttribute("fill", "#111");

  g.appendChild(bed);
  g.appendChild(cab);
  g.appendChild(hood);
  g.appendChild(win);
  g.appendChild(w1);
  g.appendChild(w2);

  svg.appendChild(g);
}

export function renderBoard(container, state, onClickSpace) {
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", "0 0 650 420");

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", 0);
  bg.setAttribute("y", 0);
  bg.setAttribute("width", 650);
  bg.setAttribute("height", 420);
  bg.setAttribute("fill", "#0c1530");
  svg.appendChild(bg);

  // version stamp
  const ver = document.createElementNS(svgNS, "text");
  ver.setAttribute("x", 12);
  ver.setAttribute("y", 18);
  ver.setAttribute("fill", "#a9b7ff");
  ver.setAttribute("font-size", "12");
  ver.textContent = `Renderer: ${RENDER_VERSION}`;
  svg.appendChild(ver);

  // Try to read SPACES if it exists globally via import mismatch (we don’t rely on it)
  // If your board-data exports SPACES, it will still be accessible only if imported there,
  // so we just render without it. Tags are optional anyway.
  // We'll show tags only if state.spaceTypes exists someday.

  // spaces (always render)
  for (let i = 0; i < TRACK_LENGTH; i++) {
    const [cx, cy] = trackToXY(i);

    const r = document.createElementNS(svgNS, "circle");
    r.setAttribute("cx", cx);
    r.setAttribute("cy", cy);
    r.setAttribute("r", 19);
    r.setAttribute("fill", "#1e2a55");
    r.setAttribute("stroke", "#2a3a74");
    r.setAttribute("stroke-width", "2");
    r.style.cursor = "pointer";
    r.addEventListener("click", () => onClickSpace(i));
    svg.appendChild(r);

    const n = document.createElementNS(svgNS, "text");
    n.setAttribute("x", cx);
    n.setAttribute("y", cy + 5);
    n.setAttribute("fill", "#fff");
    n.setAttribute("text-anchor", "middle");
    n.setAttribute("font-size", "12");
    n.textContent = String(i);
    svg.appendChild(n);

    // Optional tag support: if you later store tags in Firestore under state.spaceTagById
    const type = state?.spaceTagById?.[i];
    const tag = shortType(type);
    if (tag) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", cx);
      t.setAttribute("y", cy + 34);
      t.setAttribute("fill", "#a9b7ff");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "9");
      t.textContent = tag;
      svg.appendChild(t);
    }
  }

  // pickups (player pawns)
  const players = state.players || [];
  players.forEach((p, idx) => {
    const pos = Number.isInteger(p.pos) ? p.pos : 0;
    const [cx, cy] = trackToXY(pos);

    const offsetX = (idx % 3) * 18 - 18;
    const offsetY = -46 - Math.floor(idx / 3) * 18;

    const bodyColor = BODY_COLORS[idx % BODY_COLORS.length];
    const cabColor  = CAB_COLORS[idx % CAB_COLORS.length];

    drawPickup(svg, svgNS, cx + offsetX, cy + offsetY, bodyColor, cabColor);
  });

  container.appendChild(svg);
}
