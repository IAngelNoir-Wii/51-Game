// ============================================================
//  game.js — Lógica pura del 51 Colombiano
//  Sin dependencias de DOM. Exporta funciones y el objeto G.
// ============================================================

export const SUITS  = ['♠', '♥', '♦', '♣'];
export const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const CARD_POINTS = {
  A:10, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, J:10, Q:10, K:10
};

// ---- Deck ----

export function makeDeck() {
  const d = [];
  for (let i = 0; i < 2; i++)
    for (const s of SUITS)
      for (const v of VALUES)
        d.push({ v, s, id: d.length });
  return d;
}

export function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardPts(c)    { return CARD_POINTS[c.v] || 0; }
export function isRed(c)      { return c.s === '♥' || c.s === '♦'; }
export function cardLabel(c)  { return c.v + c.s; }
export function meldPts(cards){ return cards.reduce((s, c) => s + cardPts(c), 0); }

// ---- Validation ----

/** Trío/cuarta: mismo valor, palo único por carta, 3–4 cartas */
export function isValidSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  const v = cards[0].v;
  if (!cards.every(c => c.v === v)) return false;
  const suits = cards.map(c => c.s);
  return new Set(suits).size === suits.length;
}

/** Escalera: mismo palo, consecutiva, mín 3. As en A-2-3 o K-A-2 */
export function isValidRun(cards) {
  if (cards.length < 3) return false;
  if (!cards.every(c => c.s === cards[0].s)) return false;
  const idxs = cards.map(c => VALUES.indexOf(c.v)).sort((a, b) => a - b);
  if (idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1)) return true;
  // K-A-2: A vale 13
  const hi = cards.map(c => c.v === 'A' ? 13 : VALUES.indexOf(c.v)).sort((a, b) => a - b);
  return hi.every((v, i) => i === 0 || v === hi[i - 1] + 1);
}

export function isValidMeld(cards) {
  return isValidSet(cards) || isValidRun(cards);
}

export function canAddToMeld(meldCards, newCards) {
  return isValidMeld([...meldCards, ...newCards]);
}

/**
 * Encuentra todas las particiones válidas de `cards` en grupos de ≥3,
 * ordenadas de mayor a menor puntaje total.
 */
export function findValidPartition(cards) {
  if (cards.length === 0) return [];
  const results = [];

  function bt(remaining, current) {
    if (remaining.length === 0) {
      results.push(current.map(g => [...g]));
      return;
    }
    const n = remaining.length;
    for (let mask = 1; mask < (1 << n); mask++) {
      const group = [];
      for (let i = 0; i < n; i++) if (mask >> i & 1) group.push(remaining[i]);
      if (group.length < 3) continue;
      if (!isValidMeld(group)) continue;
      const rest = remaining.filter((_, i) => !(mask >> i & 1));
      bt(rest, [...current, group]);
    }
  }

  bt(cards, []);
  results.sort((a, b) =>
    b.reduce((s, g) => s + meldPts(g), 0) -
    a.reduce((s, g) => s + meldPts(g), 0)
  );
  return results;
}

// ---- State ----

export let G = {};

export function initGame() {
  const deck        = shuffle(makeDeck());
  const prevScores  = G.scores  || [0, 0, 0, 0];
  const starter     = G.starter !== undefined ? (G.starter + 1) % 4 : 0;

  const players = [
    { name: 'Tú',   hand: [], opened: false, isHuman: true  },
    { name: 'Ana',  hand: [], opened: false, isHuman: false },
    { name: 'Bob',  hand: [], opened: false, isHuman: false },
    { name: 'Cara', hand: [], opened: false, isHuman: false },
  ];

  for (let i = 0; i < 4; i++) {
    const count = i === starter ? 15 : 14;
    players[i].hand = deck.splice(0, count);
  }

  // El jugador inicial descarta 1 para empezar
  const firstDiscard = players[starter].hand.splice(
    Math.floor(Math.random() * players[starter].hand.length), 1
  )[0];

  G = {
    players,
    deck,
    discard:       [firstDiscard],
    turn:          starter,
    starter,
    phase:         'draw',     // 'draw' | 'play'
    tableMelds:    [],
    currentMinPts: 51,
    selected:      [],         // ids de cartas del jugador 0
    scores:        prevScores,
    roundOver:     false,
    hasDrawn:      false,
    targetMeld:    -1,         // índice del juego en mesa seleccionado para pegar
  };

  return G;
}

export function resetAll() {
  G = { scores: [0, 0, 0, 0], starter: 0 };
  return initGame();
}

// ---- Turn actions (mutate G, return { ok, msg }) ----

export function doDrawFromDeck() {
  if (G.deck.length === 0) return { ok: false, msg: 'El mazo está vacío' };
  const c = G.deck.pop();
  G.players[0].hand.push(c);
  G.phase    = 'play';
  G.hasDrawn = true;
  return { ok: true, msg: `Robaste del mazo: ${cardLabel(c)}` };
}

export function doDrawFromDiscard() {
  if (G.discard.length === 0) return { ok: false, msg: 'El descarte está vacío' };
  const p   = G.players[0];
  const top = G.discard[G.discard.length - 1];

  if (p.opened) {
    const c = G.discard.pop();
    p.hand.push(c);
    G.phase    = 'play';
    G.hasDrawn = true;
    return { ok: true, msg: `Tomaste del descarte: ${cardLabel(c)}` };
  }

  // Solo si puede abrirse ese turno
  const testHand = [...p.hand, top];
  const parts    = findValidPartition(testHand);
  const bestPts  = parts.length > 0 ? parts[0].reduce((s, g) => s + meldPts(g), 0) : 0;
  if (bestPts < G.currentMinPts)
    return { ok: false, msg: `Solo puedes tomar del descarte si te abres (≥${G.currentMinPts} pts) ese turno.` };

  const c = G.discard.pop();
  p.hand.push(c);
  G.phase    = 'play';
  G.hasDrawn = true;
  return { ok: true, msg: `Tomaste del descarte: ${cardLabel(c)}` };
}

export function doMeld(selectedIds) {
  const p   = G.players[0];
  const sel = p.hand.filter(c => selectedIds.includes(c.id));

  const partitions = findValidPartition(sel);
  if (partitions.length === 0)
    return { ok: false, msg: 'La selección no forma combinaciones válidas' };

  const best    = partitions[0];
  const bestPts = best.reduce((s, g) => s + meldPts(g), 0);

  if (!p.opened && bestPts < G.currentMinPts)
    return { ok: false, msg: `Necesitas ≥${G.currentMinPts} pts para abrirte. Tu mejor combinación: ${bestPts} pts` };

  const usedIds = new Set(best.flat().map(c => c.id));
  const unused  = sel.filter(c => !usedIds.has(c.id));
  if (unused.length > 0 && !p.opened)
    return { ok: false, msg: `Cartas sin encajar en ningún juego: ${unused.map(cardLabel).join(', ')}` };

  let msg = '';
  if (!p.opened) {
    p.opened          = true;
    G.currentMinPts   = bestPts + 1;
    msg = `¡Te abriste con ${bestPts} pts! Nuevo mínimo: ${G.currentMinPts}`;
  } else {
    msg = `Bajaste combinaciones (${bestPts} pts)`;
  }

  best.forEach(group => {
    G.tableMelds.push({ cards: group, owner: 0 });
    group.forEach(c => { p.hand = p.hand.filter(h => h.id !== c.id); });
  });

  // Devuelve las ids no usadas para mantener seleccionadas
  return { ok: true, msg, remainingSelected: unused.map(c => c.id) };
}

export function doPegToMeld(meldIdx, selectedIds) {
  const p   = G.players[0];
  const sel = p.hand.filter(c => selectedIds.includes(c.id));
  const m   = G.tableMelds[meldIdx];

  if (!canAddToMeld(m.cards, sel))
    return { ok: false, msg: 'No se puede pegar al juego seleccionado' };

  sel.forEach(c => {
    m.cards.push(c);
    p.hand = p.hand.filter(h => h.id !== c.id);
  });

  return { ok: true, msg: `Pegaste ${sel.map(cardLabel).join(', ')} al juego en mesa` };
}

export function doDiscard(cardId) {
  const p = G.players[0];
  const c = p.hand.find(h => h.id === cardId);
  if (!c) return { ok: false, msg: 'Carta no encontrada' };

  p.hand = p.hand.filter(h => h.id !== cardId);
  G.discard.push(c);
  G.phase    = 'draw';
  G.hasDrawn = false;

  return { ok: true, msg: `Descartaste: ${cardLabel(c)}` };
}

export function checkWin() {
  const p = G.players[G.turn];
  return p.opened && p.hand.length === 0;
}

export function endRound(winnerIdx) {
  G.roundOver = true;
  const deltas = G.players.map((p, i) => {
    if (i === winnerIdx) return -100;
    if (!p.opened)       return 100;
    return p.hand.reduce((s, c) => s + cardPts(c), 0);
  });
  G.scores = G.scores.map((s, i) => s + deltas[i]);
  return deltas;
}

export function nextTurn() {
  G.turn      = (G.turn + 1) % 4;
  G.phase     = 'draw';
  G.hasDrawn  = false;
  G.selected  = [];
  G.targetMeld = -1;
}

// ---- AI ----

export function aiChooseDiscard(hand) {
  if (hand.length === 0) return null;
  const scored = hand.map(c => {
    const inMeld = hand.some(o => {
      if (o.id === c.id) return false;
      return hand.some(t => {
        if (t.id === c.id || t.id === o.id) return false;
        return isValidMeld([c, o, t]);
      });
    });
    return { c, score: inMeld ? 0 : cardPts(c) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].c;
}

/**
 * Ejecuta un turno completo de IA.
 * Retorna un array de { msg } con los eventos del turno.
 */
export function aiPlayTurn(playerIdx) {
  const p      = G.players[playerIdx];
  const events = [];

  if (G.deck.length === 0) {
    return { events, deckEmpty: true };
  }

  // 1. Robar
  let tookDiscard = false;
  const topDiscard = G.discard.length > 0 ? G.discard[G.discard.length - 1] : null;
  if (topDiscard) {
    if (!p.opened) {
      const testHand = [...p.hand, topDiscard];
      const parts    = findValidPartition(testHand);
      const pts      = parts.length > 0 ? parts[0].reduce((s, g) => s + meldPts(g), 0) : 0;
      if (pts >= G.currentMinPts) {
        p.hand.push(G.discard.pop());
        tookDiscard = true;
        events.push({ msg: `${p.name} tomó del descarte` });
      }
    } else {
      const useful = G.tableMelds.some(m => canAddToMeld(m.cards, [topDiscard]));
      if (useful) {
        p.hand.push(G.discard.pop());
        tookDiscard = true;
        events.push({ msg: `${p.name} tomó del descarte` });
      }
    }
  }
  if (!tookDiscard) {
    p.hand.push(G.deck.pop());
    events.push({ msg: `${p.name} robó del mazo` });
  }

  // 2. Abrir si puede
  if (!p.opened) {
    const parts = findValidPartition(p.hand);
    if (parts.length > 0) {
      const best    = parts[0];
      const bestPts = best.reduce((s, g) => s + meldPts(g), 0);
      if (bestPts >= G.currentMinPts) {
        p.opened        = true;
        G.currentMinPts = bestPts + 1;
        const usedIds   = new Set(best.flat().map(c => c.id));
        best.forEach(g => G.tableMelds.push({ cards: g, owner: playerIdx }));
        p.hand = p.hand.filter(c => !usedIds.has(c.id));
        events.push({ msg: `${p.name} se abrió con ${bestPts} pts. Nuevo mínimo: ${G.currentMinPts}` });
      }
    }
  }

  // 3. Pegar a juegos existentes
  if (p.opened) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of [...p.hand]) {
        for (const m of G.tableMelds) {
          if (canAddToMeld(m.cards, [c])) {
            m.cards.push(c);
            p.hand  = p.hand.filter(h => h.id !== c.id);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
    // Bajar nuevos juegos
    const parts = findValidPartition(p.hand);
    if (parts.length > 0) {
      const best    = parts[0];
      const usedIds = new Set(best.flat().map(c => c.id));
      best.forEach(g => G.tableMelds.push({ cards: g, owner: playerIdx }));
      p.hand = p.hand.filter(c => !usedIds.has(c.id));
    }
  }

  // 4. Descartar
  const discard = aiChooseDiscard(p.hand);
  if (discard) {
    p.hand = p.hand.filter(c => c.id !== discard.id);
    G.discard.push(discard);
    events.push({ msg: `${p.name} descartó: ${cardLabel(discard)}` });
  }

  return { events, deckEmpty: false };
}
