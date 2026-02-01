export const TRACK_LENGTH = 30;

// Space definitions (Zoomaker-flavored v1)
export const SPACES = Array.from({ length: TRACK_LENGTH }, (_, i) => ({
  id: i,
  name: `Path ${i}`,
  type: "PATH"
}));

// Key spaces
function setSpace(i, name, type, data = {}) {
  SPACES[i] = { id: i, name, type, data };
}

setSpace(0,  "HOME GATE",        "HOME");
setSpace(3,  "TIP JAR",          "TIP",      { amount: 75 });
setSpace(5,  "ANIMAL MARKET",    "MARKET");
setSpace(7,  "VET CLINIC",       "VET",      { amount: 120 });
setSpace(10, "RUNAWAY!",         "RUNAWAY",  { amount: 150 });
setSpace(12, "DONATION DAY",     "DONATION", { amountFromEach: 50 });
setSpace(15, "HOME GATE",        "HOME");
setSpace(18, "ZOO ACCIDENT",     "ACCIDENT", { amount: 200 });
setSpace(20, "ANIMAL MARKET",    "MARKET");
setSpace(22, "TIP JAR",          "TIP",      { amount: 100 });
setSpace(25, "VET CLINIC",       "VET",      { amount: 160 });
setSpace(27, "RUNAWAY!",         "RUNAWAY",  { amount: 180 });

// Animal offers (simple tiered costs)
export const ANIMALS = [
  { name: "Meerkat",    cost: 120, tier: 1 },
  { name: "Penguin",    cost: 160, tier: 1 },
  { name: "Red Panda",  cost: 240, tier: 2 },
  { name: "Giraffe",    cost: 320, tier: 2 },
  { name: "Lion",       cost: 420, tier: 3 },
  { name: "Elephant",   cost: 520, tier: 3 }
];

export function getSpace(id) {
  return SPACES[id % TRACK_LENGTH];
}
