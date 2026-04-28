const game = new Game51();

const HUMAN_PLAYER = 0;

let selectedCards = [];
let hasDrawn = false;
let draggedIndex = null;

// Mesa de juego (combinaciones bajadas)
let table = [];

// =======================
// INICIO
// =======================
function startGameUI() {
  game.init();
  selectedCards = [];
  hasDrawn = false;
  table = [];
  render();
}

// =======================
// RENDER PRINCIPAL
// =======================
function render() {
  const container = document.getElementById("game");
  const hand = game.players[HUMAN_PLAYER];
  const isMyTurn = game.currentPlayer === HUMAN_PLAYER;

  let html = "";

  // Estado
  html += `
    <div class="status">
      ${isMyTurn ? "🟢 Tu turno" : "⏳ Esperando otros jugadores..."}
    </div>
  `;

  // =======================
  // MESA (TABLE)
  // =======================
  html += `<h3>🧩 Mesa</h3>`;
  html += `<div class="table">`;

  table.forEach((group, gIndex) => {
    html += `<div class="group">`;

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
  // MANO DEL JUGADOR
  // =======================
  html += `<h3>🃏 Tu mano</h3>`;
  html += `<div class="hand">`;

  hand.forEach((card, index) => {
    const isSelected = selectedCards.includes(index);

    html += `
      <span 
        class="card ${isSelected ? "selected" : ""}"
        draggable="true"
        ondragstart="dragStart(${index})"
        ondragover="dragOver(event)"
        ondrop="dropCard(${index})"
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
      <button onclick="drawDeck()" ${!isMyTurn ? "disabled" : ""}>
        Robar mazo
      </button>

      <button onclick="drawDiscard()" ${!isMyTurn ? "disabled" : ""}>
        Tomar descarte
      </button>

      <button onclick="playSelected()" ${!isMyTurn ? "disabled" : ""}>
        Bajar combinación
      </button>

      <button onclick="discardSelected()" ${!isMyTurn ? "disabled" : ""}>
        Descartar
      </button>
    </div>
  `;

  container.innerHTML = html;
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

function getSelectedCards() {
  const hand = game.players[HUMAN_PLAYER];
  return selectedCards.map(i => hand[i]);
}

// =======================
// DRAG & DROP
// =======================
function dragStart(index) {
  draggedIndex = index;
}

function dragOver(e) {
  e.preventDefault();
}

function dropCard(targetIndex) {
  const hand = game.players[HUMAN_PLAYER];

  const draggedCard = hand[draggedIndex];
  hand.splice(draggedIndex, 1);
  hand.splice(targetIndex, 0, draggedCard);

  draggedIndex = null;
  render();
}

// =======================
// ACCIONES
// =======================
function drawDeck() {
  if (hasDrawn) return alert("Ya robaste");
  game.drawFromDeck();
  hasDrawn = true;
  render();
}

function drawDiscard() {
  if (hasDrawn) return alert("Ya robaste");

  const top = game.drawFromDiscard();
  if (!top) return;

  game.takeDiscard();
  hasDrawn = true;
  render();
}

// =======================
// BAJAR A LA MESA
// =======================
function playSelected() {
  const cards = getSelectedCards();

  if (cards.length < 3) {
    return alert("Selecciona mínimo 3 cartas");
  }

  if (!game.isValidCombination(cards)) {
    return alert("Combinación inválida");
  }

  const success = game.open(HUMAN_PLAYER, [cards]);

  if (!success) {
    return alert("No cumples el mínimo para bajarte");
  }

  // agregar a la mesa
  table.push(cards);

  selectedCards = [];
  render();
}

// =======================
// DESCARTAR
// =======================
function discardSelected() {
  if (!hasDrawn) return alert("Debes robar primero");

  if (selectedCards.length !== 1) {
    return alert("Selecciona 1 carta");
  }

  game.discardCard(selectedCards[0]);

  selectedCards = [];
  hasDrawn = false;

  render();
}

// =======================
// INICIO
// =======================
startGameUI();
