import { TRACK_LENGTH, SPACES } from "./board-data.js";

const RENDER_VERSION = "PICKUP+ZOO-5";

const BODY_COLORS = ["#ff3b3b", "#ff9f1a", "#34c759", "#32ade6", "#af52de", "#ffd60a"];
const CAB_COLORS  = ["#ff6b6b", "#ffc266", "#6eea94", "#7ad7ff", "#d7a6ff", "#fff2a8"];

function trackToXY(i) {
  let x, y;
  if (i <= 9) { x = i; y = 0; }
  else if (i <= 14) { x = 9; y = i - 9; }
  else if (i <= 24) { x = 24 - i; y = 5; }
  else { x = 0; y = 29 - i; }
  return [55 + x * 55, 60 + y * 55];
}

function edgeForSpace(i) {
  if (i <= 9) return "TOP";
  if (i <= 14) return "RIGHT";
  if (i <= 24) return "BOTTOM";
  return "LEFT";
}

// Short label shown near special spaces
function shortType(type) {
  switch (type) {
    case "HOME": return "HOME";
    case "MARKET": return "MARKET";
    case "VET": return "VET";
    case "RUNAWAY": return "RUNAWAY";
    case "ACCIDENT": return "ACCIDENT";
    case "TIP": return "TIP";
    case "DONATION": return "DONATION";
    case "ZOO_ZONE": return "ZOO";
    default: return "";
  }
}

// Position label beside the circle depending on which edge it sits on
function labelPos(cx, cy, edge) {
  const pad = 34; // how far away from the circle center to place label
  if (edge === "TOP")    return { x: cx,        y: cy - pad, anchor: "middle" };
  if (edge === "BOTTOM") return { x: cx,        y: cy + pad + 10, anchor: "middle" };
  if (edge === "RIGHT")  return { x: cx + pad,  y: cy + 4, anchor: "start" };
  return                  { x: cx - pad,  y: cy + 4, anchor: "end" };
}

function drawPickup(svg, svgNS, x, y, edge, bodyColor, cabColor) {
  const g = document.createElementNS(svgNS, "g");

  if (edge === "TOP") g.setAttribute("transform", `translate(${x}, ${y}) translate(0, -2)`);
  else if (edge === "RIGHT") g.setAttribute("transform", `translate(${x}, ${y}) rotate(90) translate(0, -2)`);
  else if (edge === "BOTTOM") g.setAttribute("transform", `translate(${x}, ${y}) scale(-1, 1) translate(0, -2)`);
  else g.setAttribute("transform", `translate(${x}, ${y}) rotate(270) translate(0, -2)`);

  const bed = document.createElementNS(svgNS, "rect");
  bed.setAttribute("x", -18); bed.setAttribute("y", 0);
  bed.setAttribute("width", 14); bed.setAttribute("height", 8);
  bed.setAttribute("rx", 2); bed.setAttribute("fill", bodyColor);

  const cab = document.createElementNS(svgNS, "rect");
  cab.setAttribute("x", -4); cab.setAttribute("y", -6);
  cab.setAttribute("width", 16); cab.setAttribute("height", 14);
  cab.setAttribute("rx", 3); cab.setAttribute("fill", cabColor);

  const hood = document.createElementNS(svgNS, "rect");
  hood.setAttribute("x", 12); hood.setAttribute("y", 0);
  hood.setAttribute("width", 10); hood.setAttribute("height", 8);
  hood.setAttribute("rx", 2); hood.setAttribute("fill", bodyColor);

  const win = document.createElementNS(svgNS, "rect");
  win.setAttribute("x", 3); win.setAttribute("y", -4);
  win.setAttribute("width", 8); win.setAttribute("height", 5);
  win.setAttribute("rx", 1); win.setAttribute("fill", "#d9ecff");

  const w1 = document.createElementNS(svgNS, "circle");
  w1.setAttribute("cx", -10); w1.setAttribute("cy", 10);
  w1.setAttribute("r", 4); w1.setAttribute("fill", "#111");

  const w2 = document.createElementNS(svgNS, "circle");
  w2.setAttribute("cx", 12); w2.setAttribute("cy", 10);
  w2.setAttribute("r", 4); w2.setAttribute("fill", "#111");

  g.appendChild(bed); g.appendChild(cab); g.appendChild(hood);
  g.appendChild(win); g.appendChild(w1); g.appendChild(w2);
  svg.appendChild(g);
}

function drawZooTiles(svg, svgNS, state) {
  const startX = 140, startY = 135;
  const tileW = 110, tileH = 62;
  const gapX = 14, gapY = 14;

  const players = state.players || [];
  const byZoo = new Map();
  for (let i = 0; i < players.length; i++) {
    const z = players[i].homeZooIndex;
    if (Number.isInteger(z)) byZoo.set(z, { player: players[i], playerIdx: i });
  }

  for (let z = 0; z < 6; z++) {
    const col = z % 3;
    const row = Math.floor(z / 3);
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);

    const tile = document.createElementNS(svgNS, "rect");
    tile.setAttribute("x", x); tile.setAttribute("y", y);
    tile.setAttribute("width", tileW); tile.setAttribute("height", tileH);
    tile.setAttribute("rx", 12);
    tile.setAttribute("fill", "#0c1530");
    tile.setAttribute("stroke", "#2a3a74");
    tile.setAttribute("stroke-width", "2");
    svg.appendChild(tile);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x + 10); label.setAttribute("y", y + 20);
    label.setAttribute("fill", "#e8eefc");
    label.setAttribute("font-size", "13");
    label.textContent = `Zoo ${z + 1}`;
    svg.appendChild(label);

    const owner = byZoo.get(z);
    if (owner) {
      const bodyColor = BODY_COLORS[owner.playerIdx % BODY_COLORS.length];

      const badge = document.createElementNS(svgNS, "circle");
      badge.setAttribute("cx", x + tileW - 18);
      badge.setAttribute("cy", y + 18);
      badge.setAttribute("r", 8);
      badge.setAttribute("fill", bodyColor);
      svg.appendChild(badge);

      const animals = owner.player.animals || 0;
      const info = document.createElementNS(svgNS, "text");
      info.setAttribute("x", x + 10);
      info.setAttribute("y", y + 44);
      info.setAttribute("fill", "#a9b7ff");
      info.setAttribute("font-size", "12");
      info.textContent = `Animals: ${animals}`;
      svg.appendChild(info);
    } else {
      const empty = document.createElementNS(svgNS, "text");
      empty.setAttribute("x", x + 10);
      empty.setAttribute("y", y + 44);
      empty.setAttribute("fill", "#6d7bb0");
      empty.setAttribute("font-size", "12");
      empty.textContent = `Empty`;
      svg.appendChild(empty);
    }
  }
}

export function renderBoard(container, state, onClickSpace) {
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", "0 0 650 420");

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", 0); bg.setAttribute("y", 0);
  bg.setAttribute("width", 650); bg.setAttribute("height", 420);
  bg.setAttribute("fill", "#0c1530");
  svg.appendChild(bg);

  const ver = document.createElementNS(svgNS, "text");
  ver.setAttribute("x", 12); ver.setAttribute("y", 18);
  ver.setAttribute("fill", "#a9b7ff");
  ver.setAttribute("font-size", "12");
  ver.textContent = `Renderer: ${RENDER_VERSION}`;
  svg.appendChild(ver);

  for (let i = 0; i < TRACK_LENGTH; i++) {
    const [cx, cy] = trackToXY(i);
    const space = SPACES[i];
    const edge = edgeForSpace(i);

    const r = document.createElementNS(svgNS, "circle");
    r.setAttribute("cx", cx);
    r.setAttribute("cy", cy);
    r.setAttribute("r", 24);
    r.setAttribute("fill", "#1e2a55");
    r.setAttribute("stroke", "#2a3a74");
    r.setAttribute("stroke-width", "2");
    r.style.cursor = "pointer";
    r.addEventListener("click", () => onClickSpace(i));
    svg.appendChild(r);

    const n = document.createElementNS(svgNS, "text");
    n.setAttribute("x", cx);
    n.setAttribute("y", cy + 6);
    n.setAttribute("fill", "#fff");
    n.setAttribute("text-anchor", "middle");
    n.setAttribute("font-size", "13");
    n.textContent = String(i);
    svg.appendChild(n);

    const tag = shortType(space?.type);
    if (tag) {
      const lp = labelPos(cx, cy, edge);

      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", lp.x);
      t.setAttribute("y", lp.y);
      t.setAttribute("fill", "#a9b7ff");
      t.setAttribute("text-anchor", lp.anchor);
      t.setAttribute("font-size", "10");
      t.textContent = tag;
      svg.appendChild(t);
    }

    if (space?.type === "ZOO_ZONE") {
      const z = document.createElementNS(svgNS, "text");
      z.setAttribute("x", cx);
      z.setAttribute("y", cy - 32);
      z.setAttribute("fill", "#ffd60a");
      z.setAttribute("text-anchor", "middle");
      z.setAttribute("font-size", "12");
      z.textContent = "Z";
      svg.appendChild(z);
    }
  }

  drawZooTiles(svg, svgNS, state);

  const players = state.players || [];
  players.forEach((p, idx) => {
    const pos = Number.isInteger(p.pos) ? p.pos : 0;
    const [cx, cy] = trackToXY(pos);
    const edge = edgeForSpace(pos);

    const offsetX = (idx % 3) * 18 - 18;
    const offsetY = -56 - Math.floor(idx / 3) * 18;

    drawPickup(
      svg, svgNS,
      cx + offsetX, cy + offsetY,
      edge,
      BODY_COLORS[idx % BODY_COLORS.length],
      CAB_COLORS[idx % CAB_COLORS.length]
    );
  });

  container.appendChild(svg);
}
