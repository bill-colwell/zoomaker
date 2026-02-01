// board-data.js
export const BOARD = {
    // Minimal but real board: loop + a fork so we can test split paths
    tiles: [
      // Main loop 0-11
      { id: 0, type: "start",   neighbors: [1, 11] },
      { id: 1, type: "market",  neighbors: [0, 2] },
      { id: 2, type: "event",   neighbors: [1, 3] },
      { id: 3, type: "tip",     neighbors: [2, 4] },
      { id: 4, type: "vet",     neighbors: [3, 5] },
      { id: 5, type: "neutral", neighbors: [4, 6, 20] }, // fork
      { id: 6, type: "event",   neighbors: [5, 7] },
      { id: 7, type: "market",  neighbors: [6, 8] },
      { id: 8, type: "escape",  neighbors: [7, 9] },
      { id: 9, type: "neutral", neighbors: [8, 10] },
      { id:10, type: "zooZone", neighbors: [9, 11] },
      { id:11, type: "neutral", neighbors: [10, 0] },
  
      // Spur path from the fork (5 -> 20 -> 21 -> back to 7)
      { id:20, type: "event",   neighbors: [5, 21] },
      { id:21, type: "neutral", neighbors: [20, 7] }
    ],
  
    // Simple coordinates for SVG layout
    pos: {
      0:[0,0], 1:[1,0], 2:[2,0], 3:[3,0], 4:[4,0], 5:[5,0],
      6:[5,1], 7:[5,2], 8:[4,2], 9:[3,2], 10:[2,2], 11:[1,2],
      20:[6,-1], 21:[6,1.5]
    }
  };