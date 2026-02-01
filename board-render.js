import { TRACK_LENGTH, SPACES } from "./board-data.js";

function trackToXY(i) {
  // Rectangle loop layout: 30 spaces around a 10x6 perimeter
  let x, y;
  if (i <= 9) { x = i; y = 0; }
  else if (i <= 14) { x = 9; y = i - 9; }
  else if (i <= 24) { x = 24 - i; y = 5; }
  else { x = 0; y = 29 - i; }

  const px = 55 + x * 55;
  const py = 60 + y * 55;
  return [px, py];
}

function shortType(type){
  switch(type){
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

    const tag = shortType(space.type);
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

/*  // pawns
  const players = state.players || [];
  players.forEach((p, idx) => {
    const pos = Number.isInteger(p.pos) ? p.pos : 0;
    const [cx, cy] = trackToXY(pos);

    const pawn = document.createElementNS(svgNS, "circle");
    pawn.setAttribute("cx", cx + (idx % 3) * 12 - 12);
    pawn.setAttribute("cy", cy - 30 - Math.floor(idx / 3) * 12);
    pawn.setAttribute("r", 8);
    pawn.setAttribute("fill", idx === 0 ? "#ff3b3b" : "#ff9f1a"); // two-player friendly
    svg.appendChild(pawn);
  });
*/
// trucks (player pawns)
const players = state.players || [];
players.forEach((p, idx) => {
  const pos = Number.isInteger(p.pos) ? p.pos : 0;
  const [cx, cy] = trackToXY(pos);

  const group = document.createElementNS(svgNS, "g");

  // offset trucks so multiple players stack nicely
  const offsetX = (idx % 3) * 18 - 18;
  const offsetY = -38 - Math.floor(idx / 3) * 18;

  group.setAttribute(
    "transform",
    `translate(${cx + offsetX}, ${cy + offsetY}) scale(0.9)`
  );

  // truck body
  const body = document.createElementNS(svgNS, "rect");
  body.setAttribute("x", -14);
  body.setAttribute("y", -8);
  body.setAttribute("width", 28);
  body.setAttribute("height", 14);
  body.setAttribute("rx", 3);
  body.setAttribute("fill", idx === 0 ? "#ff3b3b" : "#ff9f1a");

  // cab
  const cab = document.createElementNS(svgNS, "rect");
  cab.setAttribute("x", 4);
  cab.setAttribute("y", -14);
  cab.setAttribute("width", 14);
  cab.setAttribute("height", 10);
  cab.setAttribute("rx", 2);
  cab.setAttribute("fill", idx === 0 ? "#ff6b6b" : "#ffc266");

  // wheels
  const wheel1 = document.createElementNS(svgNS, "circle");
  wheel1.setAttribute("cx", -8);
  wheel1.setAttribute("cy", 8);
  wheel1.setAttribute("r", 4);
  wheel1.setAttribute("fill", "#111");

  const wheel2 = document.createElementNS(svgNS, "circle");
  wheel2.setAttribute("cx", 10);
  wheel2.setAttribute("cy", 8);
  wheel2.setAttribute("r", 4);
  wheel2.setAttribute("fill", "#111");

  group.appendChild(body);
  group.appendChild(cab);
  group.appendChild(wheel1);
  group.appendChild(wheel2);

  svg.appendChild(group);
});
  
  container.appendChild(svg);
}
