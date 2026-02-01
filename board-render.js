import { TRACK_LENGTH, SPACE_TYPES } from "./board-data.js";

function trackToXY(i) {
  // Rectangle loop layout: 30 spaces around a 10x6 grid perimeter
  // Top: 0..9, Right: 10..14, Bottom: 15..24, Left: 25..29
  // Returns grid coords then scaled to pixels.
  let x, y;
  if (i <= 9) { x = i; y = 0; }
  else if (i <= 14) { x = 9; y = i - 9; }
  else if (i <= 24) { x = 24 - i; y = 5; }
  else { x = 0; y = 29 - i; }

  const px = 50 + x * 55;
  const py = 50 + y * 55;
  return [px, py];
}

export function renderBoard(container, state, onClickSpace) {
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", "0 0 650 420");

  // background
  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", 0);
  bg.setAttribute("y", 0);
  bg.setAttribute("width", 650);
  bg.setAttribute("height", 420);
  bg.setAttribute("fill", "#0c1530");
  svg.appendChild(bg);

  // title
  const t = document.createElementNS(svgNS, "text");
  t.setAttribute("x", 325);
  t.setAttribute("y", 35);
  t.setAttribute("fill", "#e8eefc");
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("font-size", "18");
  t.textContent = "ZOOMAKER TRACK (v1)";
  svg.appendChild(t);

  // spaces
  for (let i = 0; i < TRACK_LENGTH; i++) {
    const [cx, cy] = trackToXY(i);

    const r = document.createElementNS(svgNS, "circle");
    r.setAttribute("cx", cx);
    r.setAttribute("cy", cy);
    r.setAttribute("r", 18);
    r.setAttribute("fill", "#1e2a55");
    r.setAttribute("stroke", "#2a3a74");
    r.setAttribute("stroke-width", "2");
    r.style.cursor = "pointer";
    r.addEventListener("click", () => onClickSpace(i));
    svg.appendChild(r);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", cx);
    label.setAttribute("y", cy + 5);
    label.setAttribute("fill", "#fff");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.textContent = String(i);
    svg.appendChild(label);

    if (SPACE_TYPES[i]) {
      const tag = document.createElementNS(svgNS, "text");
      tag.setAttribute("x", cx);
      tag.setAttribute("y", cy + 34);
      tag.setAttribute("fill", "#a9b7ff");
      tag.setAttribute("text-anchor", "middle");
      tag.setAttribute("font-size", "10");
      tag.textContent = SPACE_TYPES[i];
      svg.appendChild(tag);
    }
  }

  // pawns
  const players = state.players || [];
  players.forEach((p, idx) => {
    const pos = Number.isInteger(p.pos) ? p.pos : 0;
    const [cx, cy] = trackToXY(pos);

    const pawn = document.createElementNS(svgNS, "circle");
    pawn.setAttribute("cx", cx + (idx % 3) * 10 - 10);
    pawn.setAttribute("cy", cy - 28 - Math.floor(idx / 3) * 10);
    pawn.setAttribute("r", 8);
    pawn.setAttribute("fill", "#ff3b3b");
    svg.appendChild(pawn);
  });

  container.appendChild(svg);
}
