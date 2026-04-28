const game = new Game51();

let selectedCards = [];
let hasDrawn = false;

function startGameUI() {
  game.init();
  selectedCards = [];
  hasDrawn = false;
  render();
}

// =======================
// RENDER PRINCIPAL
// =======================
function render() {
  const container = document.getElementById("game");
  const hand = game.getCurrentHand();

  let html = `<h2>Turno Jugador ${game.currentPlayer + 1}</h2>`;

  // Mano
  html += `
  <span 
    class="card ${isSelected ? 'selected' : ''}"
    onclick="toggleSelect(${index})"
  >
    ${card.value}${card.suit}
  </span>
`;
  });
  html += `</div>`;

  // Descarte
  const topDiscard = game.discard[game.discard.length - 1];
  html += `<h3>Descarte: ${
    topDiscard ? topDiscard.value + topDiscard.suit : ""
  }</h3>`;

  // Botones
  html += `
    <button onclick="drawDeck()">Robar mazo</button>
    <button onclick="drawDiscard()">Tomar descarte</button>
    <button onclick="tryOpen()">Bajarse</button>
    <button onclick="discardSelected()">Descartar seleccionada</button>
  `;

  container.innerHTML = html;
}

// =======================
// SELECCIÓN DE CARTAS
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
// ACCIONES DEL JUGADOR
// =======================

function drawDeck() {
  if (hasDrawn) return alert("Ya robaste este turno");
  game.drawFromDeck();
  hasDrawn = true;
  render();
}

function drawDiscard() {
  if (hasDrawn) return alert("Ya robaste este turno");

  const card = game.drawFromDiscard();
  if (!card) return;

  // ⚠️ Regla: solo si puede bajarse
  // (validación básica por ahora)
  game.takeDiscard();
  hasDrawn = true;
  render();
}

// =======================
// AGRUPAR CARTAS
// =======================
function getSelectedCards() {
  const hand = game.getCurrentHand();
  return selectedCards.map(i => hand[i]);
}

// =======================
// INTENTAR ABRIR
// =======================
function tryOpen() {
  const cards = getSelectedCards();

  if (cards.length < 3) {
    return alert("Selecciona mínimo 3 cartas");
  }

  if (!game.isValidCombination(cards)) {
    return alert("Combinación inválida");
  }

  const success = game.open(game.currentPlayer, [cards]);

  if (!success) {
    return alert("No cumples el mínimo para bajarte");
  }

  selectedCards = [];
  render();
}

// =======================
// DESCARTAR
// =======================
function discardSelected() {
  if (!hasDrawn) {
    return alert("Debes robar antes de descartar");
  }

  if (selectedCards.length !== 1) {
    return alert("Selecciona exactamente 1 carta para descartar");
  }

  game.discardCard(selectedCards[0]);

  selectedCards = [];
  hasDrawn = false;

  render();
}

// =======================
// INICIO AUTOMÁTICO
// =======================
startGameUI();
