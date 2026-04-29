// ============================================================
//  ui.js — Renderizado del DOM
//  Depende de game.js (G, helpers) y de style.css
// ============================================================

import {
  G, SUITS, isRed, cardLabel, meldPts, cardPts,
  findValidPartition, canAddToMeld, isValidMeld
} from './game.js';

// ---- Helpers ----

export function $(id) { return document.getElementById(id); }

export function log(msg) {
  const el = $('game-log');
  if (!el) return;
  const p = document.createElement('p');
  p.textContent = msg;
  el.appendChild(p);
  while (el.children.length > 30) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

// ---- Render completo ----

export function render() {
  renderScores();
  renderInfoBar();
  renderOpponents();
  renderPlayerHand();
  renderTableMelds();
  renderDiscardPile();
  renderButtons();
  updateHint();
  $('deck-count').textContent = G.deck.length;
}

// ---- Secciones ----

export function renderScores() {
  $('scores-bar').innerHTML = G.players.map((p, i) => `
    <div class="score-card ${i === G.turn ? 'current-turn' : ''} ${p.opened ? 'opened' : ''}">
      <div class="score-name">${p.name}</div>
      <div class="score-pts">${G.scores[i]}</div>
      <div>
        ${i === G.turn ? '<span class="score-tag tag-turn">turno</span>' : ''}
        ${p.opened
          ? '<span class="score-tag tag-opened">abierto</span>'
          : '<span class="score-tag tag-not-opened">cerrado</span>'}
      </div>
    </div>`).join('');
}

export function renderInfoBar() {
  $('info-bar').innerHTML = `
    <span class="info-pill">Min. apertura: <b>${G.currentMinPts} pts</b></span>
    <span class="info-pill">Mazo: <b>${G.deck.length}</b></span>
    <span class="info-pill">Fase: <b>${G.phase === 'draw' ? 'Robar' : 'Jugar/Descartar'}</b></span>
    <span class="info-pill">A = <b>10 pts</b></span>
  `;
}

export function renderOpponents() {
  $('opponents-area').innerHTML = G.players
    .filter((_, i) => i !== 0)
    .map(p => {
      const backs = p.hand.map(() => `<div class="card-back">·</div>`).join('');
      return `<div class="opponent-hand">
        <div class="opp-name">${p.name} (${p.hand.length})</div>
        <div class="opp-cards">${backs}</div>
      </div>`;
    }).join('');
}

export function renderPlayerHand() {
  const hand   = G.players[0].hand;
  const sorted = [...hand].sort((a, b) => {
    const si = SUITS.indexOf(a.s) - SUITS.indexOf(b.s);
    return si !== 0 ? si : ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].indexOf(a.v)
                         - ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].indexOf(b.v);
  });

  $('player-hand').innerHTML = sorted.map(c => {
    const sel = G.selected.includes(c.id);
    return `<div class="card ${isRed(c) ? 'red' : 'black'} ${sel ? 'selected' : ''}"
                 data-id="${c.id}">
      <div class="card-val">${c.v}</div>
      <div class="card-suit">${c.s}</div>
    </div>`;
  }).join('');

  $('player-card-count').textContent = hand.length;

  const st = $('player-open-status');
  st.textContent = G.players[0].opened ? '✓ Abierto' : 'Sin abrir';
  st.style.color = G.players[0].opened ? '#3B6D11' : '#A32D2D';

  const selCards = hand.filter(c => G.selected.includes(c.id));
  const sp       = $('sel-pts');
  if (selCards.length > 0) {
    sp.style.display = 'inline-block';
    sp.textContent   = `Sel: ${meldPts(selCards)} pts`;
  } else {
    sp.style.display = 'none';
  }
}

export function renderTableMelds() {
  const el = $('table-melds');
  if (G.tableMelds.length === 0) {
    el.innerHTML = '<span class="empty-melds">Ningún juego en mesa aún</span>';
    return;
  }
  el.innerHTML = G.tableMelds.map((m, mi) => {
    const isTarget = G.targetMeld === mi;
    const cards    = m.cards.map(c =>
      `<span class="meld-card ${isRed(c) ? 'red' : ''}">${c.v}${c.s}</span>`
    ).join(' ');
    return `<div class="meld-group ${isTarget ? 'target-meld' : ''}" data-meld="${mi}">
      <span class="meld-owner">${G.players[m.owner].name}</span>${cards}
    </div>`;
  }).join('');
}

export function renderDiscardPile() {
  const el = $('discard-pile-display');
  if (G.discard.length === 0) {
    el.innerHTML  = '<span class="empty-label">Vacío</span>';
    el.className  = 'top-discard';
    return;
  }
  const top    = G.discard[G.discard.length - 1];
  el.className = 'top-discard ' + (isRed(top) ? 'red' : 'black');
  el.innerHTML = `<div class="dc-val">${top.v}</div><div class="dc-suit">${top.s}</div>`;
}

export function updateHint() {
  const hint = $('hint-bar');
  if (G.turn !== 0 || G.roundOver) { hint.textContent = ''; hint.className = 'hint-bar'; return; }
  if (G.phase === 'draw')           { hint.textContent = 'Roba del mazo o del descarte para continuar.'; hint.className = 'hint-bar'; return; }

  const sel = G.players[0].hand.filter(c => G.selected.includes(c.id));
  if (sel.length === 0) { hint.textContent = 'Selecciona cartas para jugar o descartar.'; hint.className = 'hint-bar'; return; }
  if (sel.length === 1) { hint.textContent = '1 carta — puedes descartarla para terminar tu turno.'; hint.className = 'hint-bar'; return; }

  const partitions = findValidPartition(sel);
  if (partitions.length > 0) {
    const bestPts = partitions[0].reduce((s, g) => s + meldPts(g), 0);
    const p       = G.players[0];
    if (!p.opened) {
      if (bestPts >= G.currentMinPts) {
        hint.textContent = `Puedes abrirte con ${bestPts} pts. Pulsa "Bajar selección".`;
        hint.className   = 'hint-bar hint-ok';
      } else {
        hint.textContent = `Combinación válida (${bestPts} pts) pero necesitas ${G.currentMinPts} para abrirte.`;
        hint.className   = 'hint-bar hint-warn';
      }
    } else {
      hint.textContent = `Combinación válida (${bestPts} pts). Puedes bajarla.`;
      hint.className   = 'hint-bar hint-ok';
    }
  } else if (G.targetMeld >= 0) {
    const m = G.tableMelds[G.targetMeld];
    if (canAddToMeld(m.cards, sel)) {
      hint.textContent = 'Puedes pegar al juego seleccionado (verde). Haz clic en él.';
      hint.className   = 'hint-bar hint-ok';
    } else {
      hint.textContent = 'No se puede pegar a ese juego.';
      hint.className   = 'hint-bar hint-err';
    }
  } else {
    hint.textContent = 'Selección inválida. Selecciona un juego de la mesa para pegar cartas.';
    hint.className   = 'hint-bar hint-warn';
  }
}

export function renderButtons() {
  const isMyTurn = G.turn === 0 && !G.roundOver;
  const inPlay   = isMyTurn && G.phase === 'play';
  const sel      = G.players[0].hand.filter(c => G.selected.includes(c.id));

  const drawPile = $('draw-pile');
  drawPile.style.opacity = isMyTurn && G.phase === 'draw' ? '1' : '0.5';
  drawPile.style.cursor  = isMyTurn && G.phase === 'draw' ? 'pointer' : 'default';

  const discardDisplay = $('discard-pile-display');
  discardDisplay.style.opacity = isMyTurn && G.phase === 'draw' ? '1' : '0.5';

  const partitions = inPlay && sel.length >= 3 ? findValidPartition(sel) : [];
  let canMeld = false;
  if (partitions.length > 0) {
    const bestPts = partitions[0].reduce((s, g) => s + meldPts(g), 0);
    canMeld = G.players[0].opened || (bestPts >= G.currentMinPts);
  }

  $('btn-meld').disabled    = !canMeld;
  $('btn-discard').disabled = !inPlay || sel.length !== 1;
}

// ---- Modal de fin de ronda ----

export function showRoundModal(winnerIdx, deltas) {
  $('modal-container').innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>Fin de la ronda</h2>
        <p class="modal-sub">${winnerIdx >= 0
          ? G.players[winnerIdx].name + ' ganó la ronda'
          : 'Nadie ganó (mazo vacío)'}</p>
        <div class="modal-scores">
          ${G.players.map((p, i) => `
            <div class="modal-score-item ${i === winnerIdx ? 'winner' : ''}">
              <div class="name">${p.name}</div>
              <div class="pts">${G.scores[i]}</div>
              <div class="delta" style="color:${
                deltas[i] < 0 ? '#3B6D11' :
                deltas[i] === 0 ? 'var(--color-text-secondary)' : '#A32D2D'}">${
                deltas[i] > 0 ? '+' : ''}${deltas[i]}</div>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary" id="btn-next-round" style="width:100%">
          Siguiente ronda
        </button>
      </div>
    </div>`;
}
