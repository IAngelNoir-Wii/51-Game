// =======================
// CONFIGURACIÓN BASE
// =======================
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

class Card {
  constructor(value, suit) {
    this.value = value;
    this.suit = suit;
  }

  getPoints() {
    if (this.value === "A") return 1;
    if (["J","Q","K"].includes(this.value)) return 10;
    return parseInt(this.value);
  }

  toString() {
    return `${this.value}${this.suit}`;
  }
}

// =======================
// CLASE PRINCIPAL DEL JUEGO
// =======================
class Game51 {
  constructor() {
    this.players = [[], [], [], []];
    this.deck = [];
    this.discard = [];
    this.currentPlayer = 0;

    this.lastOpenValue = 50; // base para regla progresiva
    this.openedPlayers = [false, false, false, false];
  }

  // =======================
  // INICIALIZACIÓN
  // =======================
  init() {
    this.createDeck();
    this.shuffle();
    this.deal();
    this.discard.push(this.deck.pop());
  }

  createDeck() {
    this.deck = [];
    for (let d = 0; d < 2; d++) {
      for (let suit of SUITS) {
        for (let value of VALUES) {
          this.deck.push(new Card(value, suit));
        }
      }
    }
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  deal() {
    this.players = [[], [], [], []];

    // 14 cartas a todos
    for (let i = 0; i < 14; i++) {
      for (let p = 0; p < 4; p++) {
        this.players[p].push(this.deck.pop());
      }
    }

    // jugador inicial recibe 1 extra
    this.players[0].push(this.deck.pop());
  }

  // =======================
  // TURNOS
  // =======================
  nextTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
  }

  getCurrentHand() {
    return this.players[this.currentPlayer];
  }

  drawFromDeck() {
    if (this.deck.length === 0) return;
    this.players[this.currentPlayer].push(this.deck.pop());
  }

  drawFromDiscard() {
    if (this.discard.length === 0) return null;
    return this.discard[this.discard.length - 1];
  }

  takeDiscard() {
    if (this.discard.length === 0) return;
    const card = this.discard.pop();
    this.players[this.currentPlayer].push(card);
  }

  discardCard(index) {
    const hand = this.players[this.currentPlayer];
    const card = hand.splice(index, 1)[0];
    this.discard.push(card);
    this.nextTurn();
  }

  // =======================
  // VALIDACIÓN DE APERTURA
  // =======================
  canOpen(playerIndex, combinations) {
    const total = this.calculatePoints(combinations);

    const required = this.lastOpenValue + 1;

    if (!this.openedPlayers[playerIndex]) {
      if (this.lastOpenValue === 50) {
        return total >= 51;
      } else {
        return total >= required;
      }
    }

    return true;
  }

  open(playerIndex, combinations) {
    const total = this.calculatePoints(combinations);

    if (!this.canOpen(playerIndex, combinations)) {
      return false;
    }

    this.openedPlayers[playerIndex] = true;
    this.lastOpenValue = total;

    // remover cartas de la mano
    combinations.flat().forEach(card => {
      const hand = this.players[playerIndex];
      const idx = hand.findIndex(
        c => c.value === card.value && c.suit === card.suit
      );
      if (idx !== -1) hand.splice(idx, 1);
    });

    return true;
  }

  calculatePoints(combinations) {
    let total = 0;
    combinations.forEach(group => {
      group.forEach(card => {
        total += card.getPoints();
      });
    });
    return total;
  }

  // =======================
  // VALIDACIÓN DE JUGADAS
  // =======================

  isValidSet(cards) {
    if (cards.length < 3) return false;
    const value = cards[0].value;
    return cards.every(c => c.value === value);
  }

  isValidRun(cards) {
    if (cards.length < 3) return false;

    const suit = cards[0].suit;
    if (!cards.every(c => c.suit === suit)) return false;

    const order = VALUES;
    const indexes = cards.map(c => order.indexOf(c.value)).sort((a,b)=>a-b);

    // chequeo consecutivo básico
    for (let i = 1; i < indexes.length; i++) {
      if (indexes[i] !== indexes[i-1] + 1) {
        return this.isSpecialKA2(cards);
      }
    }

    return true;
  }

  // regla especial K-A-2
  isSpecialKA2(cards) {
    const values = cards.map(c => c.value);
    return values.includes("K") && values.includes("A") && values.includes("2");
  }

  isValidCombination(cards) {
    return this.isValidSet(cards) || this.isValidRun(cards);
  }

  // =======================
  // FIN DEL JUEGO
  // =======================
  isWinner(playerIndex) {
    return this.players[playerIndex].length === 0;
  }

  calculateScores() {
    return this.players.map((hand, i) => {
      if (!this.openedPlayers[i]) return 100;

      if (this.isWinner(i)) return -100;

      return hand.reduce((sum, card) => sum + card.getPoints(), 0);
    });
  }
}

// =======================
// EXPORT (para usar en UI)
// =======================
window.Game51 = Game51;
