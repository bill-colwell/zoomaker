import { TRACK_LENGTH, SPACES } from "./board-data.js";

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
  switch (type) {
    case "HOME": return "HOME";
    case "MARKET": return "MARKET";
    case "VET": return "VET";
    case "RUNAWAY": return "RUNAWAY";
    case "ACCIDENT": return "ACCIDENT";
    case "TIP": return "TIP";
    case "DONATION": return "DONATION";
    default: return "";
  }
}

// Up to 6 distinct pickup colors
const BODY_COLORS = ["#ff3b3b", "#ff9f1a", "#34c759", "#32ade6", "#af52de", "#ffd60a"];
const CAB_COLORS  = ["#ff6b6b", "#ffc266", "#6eea94", "#7ad7ff", "#d7a6ff", "#fff2a8"];

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

  // spaces
  for (let i = 0; i < TRACK_LENGTH; i++) {
    const [cx, cy] = trackToXY(i);
    const space = SPACES[i];

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

    const tag = shortType(space?.type);
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

    const g = document.createElementNS(svgNS, "g");

    // stack offsets
    const offsetX = (idx % 3) * 20 - 20;
    const offsetY = -40 - Math.floor(idx / 3) * 20;

    // scale slightly so it fits nicely
    g.setAttribute("transform", `translate(${cx + offsetX}, ${cy + offsetY}) scale(0.95)`);

    const bodyColor = BODY_COLORS[idx % BODY_COLORS.length];
    const cabColor  = CAB_COLORS[idx % CAB_COLORS.length];

    // --- Pickup shape (side view) ---
    // Bed (rear)
    const bed = document.createElementNS(svgNS, "rect");
    bed.setAttribute("x", -18);
    bed.setAttribute("y", -6);
    bed.setAttribute("width", 16);
    bed.setAttribute("height", 10);
    bed.setAttribute("rx", 2);
    bed.setAttribute("fill", bodyColor);

    // Bed rail / tailgate outline
    const bedLine = document.createElementNS(svgNS, "rect");
    bedLine.setAttribute("x", -18);
    bedLine.setAttribute("y", -6);
    bedLine.setAttribute("width", 16);
    bedLine.setAttribute("height", 10);
    bedLine.setAttribute("rx", 2);
    bedLine.setAttribute("fill", "none");
    bedLine.setAttribute("stroke", "#0b1220");
    bedLine.setAttribute("stroke-width", "1.2");
    bedLine.setAttribute("opacity", "0.5");

    // Cab base (front)
    const cab = document.createElementNS(svgNS, "rect");
    cab.setAttribute("x", -2);
    cab.setAttribute("y", -10);
    cab.setAttribute("width", 22);
    cab.setAttribute("height", 14);
    cab.setAttribute("rx", 3);
    cab.setAttribute("fill", cabColor);

    // Hood (front-most)
    const hood = document.createElementNS(svgNS, "rect");
    hood.setAttribute("x", 14);
    hood.setAttribute("y", -6);
    hood.setAttribute("width", 10);
    hood.setAttribute("height", 10);
    hood.setAttribute("rx", 2);
    hood.setAttribute("fill", bodyColor);

    // Windshield / window
    const window1 = document.createElementNS(svgNS, "polygon");
    window1.setAttribute("points", "2,-8 10,-8 12,-3 2,-3");
    window1.setAttribute("fill", "#d9ecff");
    window1.setAttribute("opacity", "0.9");

    // Small rear window
    const window2 = document.createElementNS(svgNS, "rect");
    window2.setAttribute("x", -1);
    window2.setAttribute("y", -8);
    window2.setAttribute("width", 3);
    window2.setAttribute("height", 5);
    window2.setAttribute("rx", 1);
    window2.setAttribute("fill", "#d9ecff");
    window2.setAttribute("opacity", "0.9");

    // Bumper
    const bumper = document.createElementNS(svgNS, "rect");
    bumper.setAttribute("x", 22);
    bumper.setAttribute("y", 0);
    bumper.setAttribute("width", 4);
    bumper.setAttribute("height", 4);
    bumper.setAttribute("rx", 1);
    bumper.setAttribute("fill", "#9aa7c7");

    // Wheels
    const wheelA = document.createElementNS(svgNS, "circle");
    wheelA.setAttribute("cx", -10);
    wheelA.setAttribute("cy", 6);
    wheelA.setAttribute("r", 4);
    wheelA.setAttribute("fill", "#111");

    const wheelB = document.createElementNS(svgNS, "circle");
    wheelB.setAttribute("cx", 14);
    wheelB.setAttribute("cy", 6);
    wheelB.setAttribute("r", 4);
    wheelB.setAttribute("fill", "#111");

    // Rims
    const rimA = document.createElementNS(svgNS, "circle");
    rimA.setAttribute("cx", -10);
    rimA.setAttribute("cy", 6);
    rimA.setAttribute("r", 1.8);
    rimA.setAttribute("fill", "#c7d2ff");

    const rimB = document.createElementNS(svgNS, "circle");
    rimB.setAttribute("cx", 14);
    rimB.setAttribute("cy", 6);
    rimB.setAttribute("r", 1.8);
    rimB.setAttribute("fill", "#c7d2ff");

    // Assemble (order matters for layering)
    g.appendChild(bed);
    g.appendChild(hood);
    g.appendChild(cab);
    g.appendChild(window1);
    g.appendChild(window2);
    g.appendChild(bedLine);
    g.appendChild(bumper);
    g.appendChild(wheelA);
    g.appendChild(wheelB);
    g.appendChild(rimA);
    g.appendChild(rimB);

    svg.appendChild(g);
  });

  container.appendChild(svg);
}
