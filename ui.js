const game = new Game51();

const HUMAN_PLAYER = 0;

let selectedCards = [];
let hasDrawn = false;
let tookDiscard = false;
let draggedIndex = null;

// Mesa
let table = [];

// UX highlight
let hoverGroupIndex = null;

// =======================
// INICIO
// =======================
function startGameUI() {
  game.init();
  selectedCards = [];
  hasDrawn = false;
  tookDiscard = false;
  table = [];
  render();
}

// =======================
// HELPERS
// =======================
const ORDER = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function cardPoints(c){
  if (c.value === "A") return 1;
  if (["J","Q","K"].includes(c.value)) return 10;
  return parseInt(c.value);
}

// =======================
// VALIDAR PEGADO
// =======================
function canAttach(card, group) {
  // SET
  if (group.every(c => c.value === group[0].value)) {
    return card.value === group[0].value;
  }

  // RUN
  if (group.every(c => c.suit === group[0].suit)) {
    const values = group.map(c => ORDER.indexOf(c.value)).sort((a,b)=>a-b);
    const min = values[0];
    const max = values[values.length - 1];
    const cardIndex = ORDER.indexOf(card.value);

    return (
      card.suit === group[0].suit &&
      (cardIndex === min - 1 || cardIndex === max + 1)
    );
  }

  return false;
}

function attachToGroup(card, groupIndex) {
  if (canAttach(card, table[groupIndex])) {
    table[groupIndex].push(card);
    return true;
  }
  return false;
}

// =======================
// RENDER
// =======================
function render() {
  const container = document.getElementById("game");
  const hand = game.players[HUMAN_PLAYER];
  const isMyTurn = game.currentPlayer === HUMAN_PLAYER;

  let html = "";

  // Estado
  html += `
    <div class="status">
      ${isMyTurn ? "🟢 Tu turno" : "⏳ Turno de IA..."}
    </div>
  `;

  // =======================
  // MESA
  // =======================
  html += `<h3>🧩 Mesa</h3><div class="table">`;

  table.forEach((group, gIndex) => {
    const highlight = (hoverGroupIndex === gIndex) ? "highlight" : "";

    html += `
      <div 
        class="group ${highlight}"
        ondragover="onGroupDragOver(event, ${gIndex})"
        ondragleave="onGroupLeave()"
        ondrop="onDropToGroup(${gIndex})"
      >
    `;

    group.forEach(card => {
      html += `<span class="card">${card.value}${card.suit}</span>`;
    });

    html += `</div>`;
  });

  html += `</div>`;

  // =======================
  // DESCARTE
  // =======================
  const topDiscard = game.discard[game.discard.length - 1];
  html += `
    <div class="discard">
      <strong>Descarte:</strong>
      ${
        topDiscard
          ? `<span class="card">${topDiscard.value}${topDiscard.suit}</span>`
          : "Vacío"
      }
    </div>
  `;

  // =======================
  // MANO
  // =======================
  html += `<h3>🃏 Tu mano</h3><div class="hand">`;

  hand.forEach((card, index) => {
    const isSelected = selectedCards.includes(index);

    html += `
      <span 
        class="card ${isSelected ? "selected" : ""}"
        draggable="true"
        ondragstart="dragStart(${index})"
        onclick="toggleSelect(${index})"
      >
        ${card.value}${card.suit}
      </span>
    `;
  });

  html += `</div>`;

  // =======================
  // CONTROLES
  // =======================
  html += `
    <div class="controls">
      <button onclick="drawDeck()" ${!isMyTurn ? "disabled" : ""}>Robar</button>
      <button onclick="drawDiscard()" ${!isMyTurn ? "disabled" : ""}>Descarte</button>
      <button onclick="playSelected()" ${!isMyTurn ? "disabled" : ""}>Bajar</button>
      <button onclick="discardSelected()" ${!isMyTurn ? "disabled" : ""}>Descartar</button>
    </div>
  `;

  container.innerHTML = html;

  // IA
  if (!isMyTurn) {
    setTimeout(playAITurn, 700);
  }
}

// =======================
// DRAG & DROP (MESA)
// =======================
function dragStart(index) {
  draggedIndex = index;
}

function onGroupDragOver(e, groupIndex) {
  e.preventDefault();

  const card = game.players[HUMAN_PLAYER][draggedIndex];

  if (canAttach(card, table[groupIndex])) {
    hoverGroupIndex = groupIndex;
  } else {
    hoverGroupIndex = null;
  }

  render();
}

function onGroupLeave() {
  hoverGroupIndex = null;
  render();
}

function onDropToGroup(groupIndex) {
  const hand = game.players[HUMAN_PLAYER];
  const card = hand[draggedIndex];

  if (attachToGroup(card, groupIndex)) {
    hand.splice(draggedIndex, 1);
  }

  draggedIndex = null;
  hoverGroupIndex = null;
  render();
}

// =======================
// SELECCIÓN
// =======================
function toggleSelect(index) {
  if (selectedCards.includes(index)) {
    selectedCards = selectedCards.filter(i => i !== index);
  } else {
    selectedCards.push(index);
  }
  render();
}

// =======================
// JUGAR
// =======================
function playSelected() {
  const hand = game.players[HUMAN_PLAYER];
  const cards = selectedCards.map(i => hand[i]);

  if (cards.length >= 3 && game.isValidCombination(cards)) {
    const success = game.open(HUMAN_PLAYER, [cards]);
    if (success) {
      table.push(cards);
      selectedCards.sort((a,b)=>b-a).forEach(i => hand.splice(i,1));
    }
  }

  selectedCards = [];
  render();
}

// =======================
// DESCARTE ESTRICTO
// =======================
function drawDeck() {
  if (hasDrawn) return;
  game.drawFromDeck();
  hasDrawn = true;
  render();
}

function drawDiscard() {
  if (hasDrawn) return;

  game.takeDiscard();
  hasDrawn = true;
  tookDiscard = true;
  render();
}

function discardSelected() {
  if (!hasDrawn) return;

  if (tookDiscard) {
    return alert("Debes bajar antes de descartar");
  }

  if (selectedCards.length !== 1) return;

  game.discardCard(selectedCards[0]);

  selectedCards = [];
  hasDrawn = false;
  tookDiscard = false;

  render();
}

// =======================
// IA (simplificada aquí)
// =======================
function playAITurn() {
  const p = game.currentPlayer;
  const hand = game.players[p];

  game.drawFromDeck();

  // pegar agresivo
  for (let i = hand.length - 1; i >= 0; i--) {
    for (let g = 0; g < table.length; g++) {
      if (canAttach(hand[i], table[g])) {
        table[g].push(hand[i]);
        hand.splice(i,1);
        break;
      }
    }
  }

  if (hand.length > 0) {
    const idx = Math.floor(Math.random() * hand.length);
    game.discardCard(idx);
  }

  render();
}

// =======================
startGameUI();
