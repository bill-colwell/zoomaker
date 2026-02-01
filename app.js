async function rollDice() {
  if (!gameId) { alert("Create or join a game first."); return; }

  // UI dice tumble
  die1El.classList.add("rolling");
  die2El.classList.add("rolling");

  let ticks = 0;
  const timer = setInterval(() => {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    setDiceFaces(a, b);
    ticks++;
    if (ticks >= 7) clearInterval(timer);
  }, 60);

  await new Promise(r => setTimeout(r, 520));

  const ref = doc(db, "games", gameId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const state = snap.data();
    const players = [...(state.players || [])];
    if (!players.length) return;

    const turnP = currentTurnPlayer(state);
    if (!turnP || turnP.id !== playerId) return;
    if (state.pendingOffer) return;

    // movement dice
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    const idx = players.findIndex(p => p.id === playerId);
    const cur = Number.isInteger(players[idx].pos) ? players[idx].pos : 0;
    const next = (cur + total) % TRACK_LENGTH;

    // ✅ PAYDAY RULE: if you pass HOME (tile 0) during this move
    // Works for normal moves AND wrap-around.
    const passedHome = (cur + total) >= TRACK_LENGTH;

    let paydayRoll = null;
    let paydayAmount = 0;

    if (passedHome) {
      paydayRoll = 1 + Math.floor(Math.random() * 6);
      paydayAmount = (paydayRoll === 6) ? 0 : paydayRoll * 100;

      players[idx] = {
        ...players[idx],
        money: (players[idx].money || 0) + paydayAmount
      };
    }

    // update position after payday calc
    players[idx] = { ...players[idx], pos: next };

    const space = getSpace(next);

    let lastEvent = { title: `Landed on: ${space.name}`, body: `Space ${next} • ${space.type}` };
    let pendingOffer = null;
    let turnIndex = state.turnIndex || 0;

    // If payday happened, prepend a note to the event text
    function withPayday(title, body) {
      if (!passedHome) return { title, body };
      const payLine =
        paydayRoll === 6
          ? `Passed HOME → Payday roll: 6 → $0 earned.`
          : `Passed HOME → Payday roll: ${paydayRoll} → $${paydayAmount} earned.`;
      return { title, body: `${payLine}\n\n${body}` };
    }

    if (space.type === "TIP") {
      const amt = space.data.amount || 50;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) + amt };
      lastEvent = withPayday("Tip Jar!", `Visitors tipped you $${amt}.`);
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "VET") {
      const amt = space.data.amount || 120;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = withPayday("Vet Clinic", `Animal checkup: Pay $${amt}.`);
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "RUNAWAY") {
      const amt = space.data.amount || 150;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = withPayday("Runaway!", `Hire a capture crew: Pay $${amt}.`);
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "ACCIDENT") {
      const amt = space.data.amount || 200;
      players[idx] = { ...players[idx], money: (players[idx].money || 0) - amt };
      lastEvent = withPayday("Zoo Accident", `Repairs & liability: Pay $${amt}.`);
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "DONATION") {
      const amt = space.data.amountFromEach || 50;
      let gained = 0;
      for (let p = 0; p < players.length; p++) {
        if (p === idx) continue;
        players[p] = { ...players[p], money: (players[p].money || 0) - amt };
        gained += amt;
      }
      players[idx] = { ...players[idx], money: (players[idx].money || 0) + gained };
      lastEvent = withPayday("Donation Day!", `Each other player pays you $${amt} (you gained $${gained}).`);
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "MARKET") {
      const animal = pickAnimalOffer();
      pendingOffer = { forPlayerId: playerId, animal, createdAt: Date.now() };
      lastEvent = withPayday("Animal Market", `Offer: ${animal.name} for $${animal.cost} (Tier +${animal.tier}).`);
      // do NOT advance turn until offer resolved
    }
    else if (space.type === "ZOO_ZONE") {
      const target = pickRandomOtherPlayer(players, playerId);
      if (!target) {
        lastEvent = withPayday("Zoo Visit Zone", "No other players yet — nobody to visit.");
      } else {
        const fee = admissionForZoo(target);
        players[idx] = { ...players[idx], money: (players[idx].money || 0) - fee };
        const tIdx = players.findIndex(p => p.id === target.id);
        players[tIdx] = { ...players[tIdx], money: (players[tIdx].money || 0) + fee };
        lastEvent = withPayday("Zoo Visit!", `Random visit: Zoo ${target.homeZooIndex + 1} • Admission $${fee}`);
      }
      turnIndex = (turnIndex + 1) % players.length;
    }
    else if (space.type === "HOME") {
      // landing on home is not payday — payday is ONLY for passing
      lastEvent = withPayday("Home", "You’re at Home. (Payday only happens when you pass Home.)");
      turnIndex = (turnIndex + 1) % players.length;
    }
    else {
      lastEvent = withPayday(space.name, "Nothing special happened. Next player!");
      turnIndex = (turnIndex + 1) % players.length;
    }

    tx.update(ref, {
      players,
      turnIndex,
      pendingOffer,
      lastEvent,
      lastDice: { d1, d2, total, by: playerId, paydayRoll, paydayAmount }
    });
  });

  die1El.classList.remove("rolling");
  die2El.classList.remove("rolling");
}
