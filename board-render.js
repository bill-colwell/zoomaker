import { BOARD } from "./board-data.js";

export function renderBoard(container, state, onClick) {
  container.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", "0 0 500 120");

  BOARD.tiles.forEach(t => {
    const [x,y] = BOARD.pos[t.id];
    const cx = 60 + x * 90;
    const cy = 60;

    const c = document.createElementNS(svg.namespaceURI,"circle");
    c.setAttribute("cx",cx);
    c.setAttribute("cy",cy);
    c.setAttribute("r",20);
    c.setAttribute("fill","#1e2a55");
    c.onclick = () => onClick(t.id);
    svg.appendChild(c);

    const label = document.createElementNS(svg.namespaceURI,"text");
    label.setAttribute("x",cx);
    label.setAttribute("y",cy+5);
    label.setAttribute("fill","#fff");
    label.setAttribute("text-anchor","middle");
    label.textContent = t.id;
    svg.appendChild(label);
  });

  state.players.forEach(p => {
    const [x] = BOARD.pos[p.tileId];
    const pawn = document.createElementNS(svg.namespaceURI,"circle");
    pawn.setAttribute("cx",60 + x*90);
    pawn.setAttribute("cy",30);
    pawn.setAttribute("r",8);
    pawn.setAttribute("fill","red");
    svg.appendChild(pawn);
  });

  container.appendChild(svg);
}