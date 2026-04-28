const game = new Game51();

const HUMAN_PLAYER = 0;

let selectedCards = [];
let hasDrawn = false;
let tookDiscard = false;
let draggedIndex = null;

let table = [];
let staging = [];

// =======================
// CONFIG
// =======================
const ORDER = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function cardPoints(c){
  if (c.value === "A") return 1;
  if (["J","Q","K"].includes(c.value)) return 10;
  return parseInt(c.value);
}

// =======================
// VALIDACIÓN
// =======================
function getStagingInfo() {
  let total = 0;
  let valid = true;

  const details = staging.map(group => {
    const isValid = group.length >= 3 && game.isValidCombination(group);
    const points = group.reduce((s,c)=>s + cardPoints(c),0);

    if (!isValid) valid = false;
    total += points;

    return { isValid, points };
  });

  const minRequired = (game.lastOpenValue === 50) ? 51 : game.lastOpenValue + 1;

  const meetsTotal = total >= minRequired;

  return {
    total,
    valid: valid && meetsTotal,
    meetsTotal,
    minRequired,
    details
  };
}

// =======================
// RENDER
// =======================
function render() {
  const container = document.getElementById("game");
  const hand = game.players[HUMAN_PLAYER];
  const isMyTurn = game.currentPlayer === HUMAN_PLAYER;

  const info = getStagingInfo();

  let html = "";

  html += `
    <div class="status">
      ${isMyTurn ? "🟢 Tu turno" : "⏳ IA..."}
    </div>
  `;

  // =======================
  // STAGING
  // =======================
  html += `<h3>🧪 Preparando jugada</h3>`;
  html += `<div class="staging">`;

  staging.forEach((group, gIndex) => {
    const state = info.details[gIndex];
    const cls = state?.isValid ? "valid" : "invalid";

    html += `
      <div 
        class="group staging-group ${cls}"
        ondragover="onStagingDragOver(event, ${gIndex})"
        ondrop="onDropToStaging(${gIndex})"
      >
    `;

    group.forEach(card => {
      html += `<span class="card">${card.value}${card.suit}</span>`;
    });

    html += `<div class="group-points">${state?.points || 0} pts</div>`;
    html += `</div>`;
  });

  html += `
    <div 
      class="group staging-new"
      ondragover="allowDrop(event)"
      ondrop="createNewGroup()"
    >
      + Nuevo grupo
    </div>
  `;

  html += `</div>`;

  // resumen
  html += `
    <div class="staging-summary">
      Total: ${info.total} / ${info.minRequired}
      ${info.meetsTotal ? "✅" : "❌"}
    </div>
  `;

  // =======================
  // MESA
  // =======================
  html += `<h3>🧩 Mesa</h3><div class="table">`;

  table.forEach(group => {
    html += `<div class="group">`;
    group.forEach(card => {
      html += `<span class="card">${card.value}${card.suit}</span>`;
    });
    html += `</div>`;
  });

  html += `</div>`;

  // =======================
  // MANO
  // =======================
  html += `<h3>🃏 Tu mano</h3><div class="hand">`;

  hand.forEach((card, index) => {
    html += `
      <span 
        class="card"
        draggable="true"
        ondragstart="dragStart(${index})"
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
      <button onclick="drawDeck()">Robar</button>
      <button onclick="drawDiscard()">Descarte</button>
      <button onclick="confirmPlay()" ${!info.valid ? "disabled" : ""}>
        Confirmar jugada
      </button>
      <button onclick="cancelStaging()">Cancelar</button>
    </div>
  `;

  container.innerHTML = html;
}

// =======================
// DRAG
// =======================
function dragStart(index) {
  draggedIndex = index;
}

function allowDrop(e){
  e.preventDefault();
}

function createNewGroup() {
  const hand = game.players[HUMAN_PLAYER];
  staging.push([hand[draggedIndex]]);
  hand.splice(draggedIndex,1);
  draggedIndex = null;
  render();
}

function onStagingDragOver(e){
  e.preventDefault();
}

function onDropToStaging(groupIndex){
  const hand = game.players[HUMAN_PLAYER];
  staging[groupIndex].push(hand[draggedIndex]);
  hand.splice(draggedIndex,1);
  draggedIndex = null;
  render();
}

// =======================
// ACCIONES
// =======================
function confirmPlay() {
  const info = getStagingInfo();

  if (!info.valid) return;

  const success = game.open(HUMAN_PLAYER, staging);
  if (!success) return;

  staging.forEach(g => table.push(g));
  staging = [];
  tookDiscard = false;

  render();
}

function cancelStaging() {
  const hand = game.players[HUMAN_PLAYER];
  staging.flat().forEach(c => hand.push(c));
  staging = [];
  render();
}

// =======================
// ROBO
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

// =======================
startGameUI();
