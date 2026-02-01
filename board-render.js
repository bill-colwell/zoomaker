// board-render.js
import { BOARD } from "./board-data.js";

const TYPE_ICON = {
  start: "🏁",
  neutral: "•",
  market: "🦁",
  event: "🃏",
  vet: "🩺",
  escape: "🏃",
  tip: "🎁",
  zooZone: "🎟️"
};

export function renderBoard(container, state, onTileClick) {
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  const scale = 90;
  const pad = 110;

  const coords = Object.values(BOARD.pos);
  const xs = coords.map(([x]) => x);
  const ys = coords.map(([,y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const width  = (maxX - minX) * scale + pad * 2;
  const height = (maxY - minY) * scale + pad * 2;

  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.background = "#0b1220";
  svg.style.border = "1px solid #223";
  svg.style.borderRadius = "12px";

  const toPx = (id) => {
    const [gx, gy] = BOARD.pos[id];
    return {
      x: (gx - minX) * scale + pad,
      y: (gy - minY) * scale + pad
    };
  };

  // Draw connections
  const drawn = new Set();
  for (const t of BOARD.tiles) {
    const a = toPx(t.id);
    for (const nb of t.neighbors) {
      const key = [t.id, nb].sort((p,q)=>p-q).join("-");
      if (drawn.has(key)) continue;
      drawn.add(key);
      const b = toPx(nb);

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("stroke", "#2a355a");
      line.setAttribute("stroke-width", "6");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }
  }

  // Highlight selectable tiles during fork choice
  const selectable = new Set(state?.pendingChoices ?? []);

  // Draw tiles
  for (const t of BOARD.tiles) {
    const p = toPx(t.id);

    const g = document.createElementNS(svgNS, "g");
    g.style.cursor = "pointer";

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", p.x);
    circle.setAttribute("cy", p.y);
    circle.setAttribute("r", "26");
    const isSelectable = selectable.has(t.id);
    circle.setAttribute("fill", isSelectable ? "#2b5cff" : "#111a33");
    circle.setAttribute("stroke", "#3a4a7a");
    circle.setAttribute("stroke-width", "3");

    const icon = document.createElementNS(svgNS, "text");
    icon.setAttribute("x", p.x);
    icon.setAttribute("y", p.y + 6);
    icon.setAttribute("text-anchor", "middle");
    icon.setAttribute("font-size", "18");
    icon.setAttribute("fill", "#e8eefc");
    icon.textContent = TYPE_ICON[t.type] ?? "•";

    const idText = document.createElementNS(svgNS, "text");
    idText.setAttribute("x", p.x);
    idText.setAttribute("y", p.y + 42);
    idText.setAttribute("text-anchor", "middle");
    idText.setAttribute("font-size", "12");
    idText.setAttribute("fill", "#93a4d8");
    idText.textContent = `#${t.id}`;

    g.appendChild(circle);
    g.appendChild(icon);
    g.appendChild(idText);

    g.addEventListener("click", () => onTileClick?.(t.id));
    svg.appendChild(g);
  }

  // Draw pawns
  const colors = ["#ff5c5c", "#ffd55c", "#5cff9a", "#5cc8ff", "#b85cff", "#ff5cf2"];
  const players = state?.players ?? [];
  players.forEach((pl, i) => {
    const tileId = pl.tileId ?? 0;
    const p = toPx(tileId);

    const pawn = document.createElementNS(svgNS, "circle");
    pawn.setAttribute("cx", p.x + (i % 3) * 12 - 12);
    pawn.setAttribute("cy", p.y - Math.floor(i / 3) * 12 - 12);
    pawn.setAttribute("r", "10");
    pawn.setAttribute("fill", colors[i % colors.length]);
    pawn.setAttribute("stroke", "#0b1220");
    pawn.setAttribute("stroke-width", "2");
    svg.appendChild(pawn);
  });

  container.appendChild(svg);
}