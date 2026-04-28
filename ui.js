const game = new Game51();

const HUMAN_PLAYER = 0;

let selectedCards = [];
let hasDrawn = false;
let draggedIndex = null;

// Mesa (combinaciones visibles)
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
// HELPERS IA
// =======================
const ORDER = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function cardPoints(c){
  if (c.value === "A") return 1;
  if (["J","Q","K"].includes(c.value)) return 10;
  return parseInt(c.value);
}

function cloneHand(hand){
  return hand.slice();
}

function byValue(a,b){
  return ORDER.indexOf(a.value) - ORDER.indexOf(b.value);
}

function groupByValue(hand){
  const m = {};
  hand.forEach(c=>{
    if(!m[c.value]) m[c.value]=[];
    m[c.value].push(c);
  });
  return m;
}

function groupBySuit(hand){
  const m = {};
  hand.forEach(c=>{
    if(!m[c.suit]) m[c.suit]=[];
    m[c.suit].push(c);
  });
  return m;
}

// Detecta tríos/cuartas (devuelve grupos de 3 o 4)
function findSets(hand){
  const res = [];
  const map = groupByValue(hand);
  Object.values(map).forEach(g=>{
    if(g.length >= 3){
      // usar 3 o 4 según convenga (probamos ambos)
      res.push(g.slice(0,3));
      if(g.length >= 4) res.push(g.slice(0,4));
    }
  });
  return res;
}

// Detecta escaleras (incluye K-A-2)
function findRuns(hand){
  const res = [];
  const bySuitMap = groupBySuit(hand);

  Object.values(bySuitMap).forEach(cards=>{
    const sorted = cards.slice().sort(byValue);

    // runs normales
    for(let i=0;i<sorted.length;i++){
      let run = [sorted[i]];
      for(let j=i+1;j<sorted.length;j++){
        const prev = ORDER.indexOf(run[run.length-1].value);
        const cur  = ORDER.indexOf(sorted[j].value);
        if(cur === prev + 1){
          run.push(sorted[j]);
          if(run.length >= 3){
            res.push(run.slice());
          }
        } else if(cur === prev){
          // mismo valor duplicado por doble baraja: ignorar duplicado
          continue;
        } else {
          break;
        }
      }
    }

    // especial K-A-2
    const hasK = cards.find(c=>c.value==="K");
    const hasA = cards.find(c=>c.value==="A");
    const has2 = cards.find(c=>c.value==="2");
    if(hasK && hasA && has2){
      res.push([hasK, hasA, has2]);
    }
  });

  return res;
}

// Genera combinaciones candidatas (sets + runs)
function findAllCombos(hand){
  return [...findSets(hand), ...findRuns(hand)];
}

// Intenta construir una apertura que cumpla mínimo requerido (51 o progresivo)
// Estrategia: backtracking limitado (rápido) para combinar grupos sin repetir cartas
function chooseOpeningCombos(hand, minRequired){
  const combos = findAllCombos(hand)
    // ordenar por valor descendente para alcanzar mínimo rápido
    .sort((a,b)=> sumPoints(b) - sumPoints(a));

  let best = null;

  function sumPoints(group){
    return group.reduce((s,c)=>s + cardPoints(c), 0);
  }

  function backtrack(start, usedSet, acc, accPoints){
    if(accPoints >= minRequired){
      best = acc.slice();
      return true;
    }
    for(let i=start;i<combos.length;i++){
      const g = combos[i];

      // verificar que no repita cartas
      if(g.some(c=> usedSet.has(c))) continue;

      // elegir
      g.forEach(c=> usedSet.add(c));
      acc.push(g);

      if(backtrack(i+1, usedSet, acc, accPoints + sumPoints(g))) return true;

      // deshacer
      acc.pop();
      g.forEach(c=> usedSet.delete(c));
    }
    return false;
  }

  backtrack(0, new Set(), [], 0);
  return best; // puede ser null
}

// Evalúa si tomar descarte ayuda a abrir o mejorar
function shouldTakeDiscard(hand, topDiscard, minRequired, alreadyOpened){
  if(!topDiscard) return false;

  const testHand = hand.concat([topDiscard]);

  // 1) Si ayuda a abrir (prioridad)
  const open = chooseOpeningCombos(testHand, minRequired);
  if(open) return true;

  // 2) Si ya abrió, ver si aumenta combos disponibles
  if(alreadyOpened){
    const before = findAllCombos(hand).length;
    const after  = findAllCombos(testHand).length;
    if(after > before) return true;
  }

  // 3) Si forma trío directo con dos iguales en mano
  const same = hand.filter(c=>c.value === topDiscard.value);
  if(same.length >= 2) return true;

  return false;
}

// Escoge carta a descartar (heurística simple)
// Prefiere cartas que no estén en combos potenciales y de mayor valor
function chooseDiscardIndex(hand){
  const combos = findAllCombos(hand);
  const inCombo = new Set();
  combos.forEach(g=> g.forEach(c=> inCombo.add(c)));

  // candidatos “muertos”
  let candidates = hand
    .map((c, i)=> ({c, i}))
    .filter(({c})=> !inCombo.has(c));

  if(candidates.length === 0){
    candidates = hand.map((c,i)=>({c,i}));
  }

  // descartar la de mayor puntaje
  candidates.sort((a,b)=> cardPoints(b.c) - cardPoints(a.c));
  return candidates[0].i;
}

// =======================
// IA TURN
// =======================
function playAITurn() {
  const p = game.currentPlayer;
  const hand = game.players[p];
  const alreadyOpened = game.openedPlayers[p];

  const minRequired = (game.lastOpenValue === 50) ? 51 : (game.lastOpenValue + 1);

  // 1) Decidir robo
  const top = game.discard[game.discard.length - 1];
  if (shouldTakeDiscard(hand, top, minRequired, alreadyOpened)) {
    game.takeDiscard();
  } else {
    game.drawFromDeck();
  }

  // 2) Intentar abrir (si no ha abierto)
  if (!alreadyOpened) {
    const openCombos = chooseOpeningCombos(hand, minRequired);
    if (openCombos) {
      const ok = game.open(p, openCombos);
      if (ok) {
        openCombos.forEach(g => table.push(g));
      }
    }
  }

  // 3) Si ya abrió, bajar más combos (sin repetir cartas)
  if (game.openedPlayers[p]) {
    const extra = findAllCombos(hand);
    // intentar bajar grupos válidos uno por uno (evitando conflicto)
    extra.forEach(g=>{
      // verificar que todas las cartas sigan en mano
      const canUse = g.every(c => hand.includes(c));
      if(canUse && game.isValidCombination(g)){
        // remover de mano
        g.forEach(card=>{
          const idx = hand.indexOf(card);
          if(idx !== -1) hand.splice(idx,1);
        });
        table.push(g);
      }
    });
  }

  // 4) Descartar
  const discardIndex = chooseDiscardIndex(hand);
  game.discardCard(discardIndex);

  render();
}

// =======================
// RENDER
// =======================
function render() {
  const container = document.getElementById("game");
  const hand = game.players[HUMAN_PLAYER];
  const isMyTurn = game.currentPlayer === HUMAN_PLAYER;

  let html = "";

  html += `
    <div class="status">
      ${isMyTurn ? "🟢 Tu turno" : "⏳ Turno de IA..."}
    </div>
  `;

  // Mesa
  html += `<h3>🧩 Mesa</h3><div class="table">`;
  table.forEach(group => {
    html += `<div class="group">`;
    group.forEach(card => {
      html += `<span class="card">${card.value}${card.suit}</span>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  // Descarte
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

  // Mano
  html += `<h3>🃏 Tu mano</h3><div class="hand">`;
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

  // Controles
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

  // Disparar IA si no es tu turno
  if (!isMyTurn) {
    setTimeout(playAITurn, 700);
  }
}

// =======================
// HUMANO
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

// Drag & drop
function dragStart(index) { draggedIndex = index; }
function dragOver(e) { e.preventDefault(); }
function dropCard(targetIndex) {
  const hand = game.players[HUMAN_PLAYER];
  const draggedCard = hand[draggedIndex];
  hand.splice(draggedIndex, 1);
  hand.splice(targetIndex, 0, draggedCard);
  draggedIndex = null;
  render();
}

// Acciones humano
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

  // Nota: aquí aún no forzamos la regla estricta de “debe bajarse”
  game.takeDiscard();
  hasDrawn = true;
  render();
}

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

  table.push(cards);

  selectedCards = [];
  render();
}

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
// START
// =======================
startGameUI();
