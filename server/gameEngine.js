const MAX_COUNTER = 100;
const STARTING_HAND = 2;

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const isAceOfSpades = (card) => card.rank === 'A' && card.suit === '♠️';
const isNumberRank = (rank) => /^[0-9]+$/.test(rank);

const clonePlayers = (players) =>
  players.map((player) => ({
    ...player,
    hand: [...player.hand],
  }));

const cloneState = (state) => ({
  ...state,
  players: clonePlayers(state.players),
  pile: [...state.pile],
  log: [...state.log],
});

const drawCard = (state) => {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const card = { id: `${rank}${suit}-${state.nextCardId}`, rank, suit };
  return { card, nextCardId: state.nextCardId + 1 };
};

const addLog = (state, message) => {
  state.log = [message, ...state.log];
};

const getNextAliveIndex = (startIndex, players) => {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const idx = (startIndex + offset) % players.length;
    if (players[idx]?.alive) {
      return idx;
    }
  }
  return -1;
};

const isCardPlayable = (card, counter) => {
  if (card.rank === 'K' || card.rank === 'J') return true;
  if (card.rank === 'Q') return counter + 30 <= MAX_COUNTER || counter - 30 >= 0;
  if (isAceOfSpades(card)) return true;
  if (card.rank === '4') return counter + 4 <= MAX_COUNTER;
  if (card.rank === 'A') return counter + 1 <= MAX_COUNTER;
  if (isNumberRank(card.rank)) return counter + Number(card.rank) <= MAX_COUNTER;
  return false;
};

const removeCardFromHand = (players, playerId, cardId) => {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  player.hand = player.hand.filter((card) => card.id !== cardId);
};

const drawToPlayer = (state, playerId) => {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const draw = drawCard(state);
  state.nextCardId = draw.nextCardId;
  player.hand.push(draw.card);
};

const advanceTurnFrom = (state, fromPlayerId) => {
  if (state.players.filter((player) => player.alive).length <= 1) {
    state.currentPlayerId = null;
    return;
  }
  const startIndex = state.players.findIndex((player) => player.id === fromPlayerId);
  let nextIndex = getNextAliveIndex(startIndex, state.players);
  if (nextIndex >= 0 && state.skipNext) {
    state.skipNext = false;
    nextIndex = getNextAliveIndex(nextIndex, state.players);
  }
  state.currentPlayerId = state.players[nextIndex]?.id ?? null;
};

const eliminatePlayer = (state, playerId, reason) => {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return;
  player.alive = false;
  addLog(state, `${player.name} was eliminated. ${reason}`);
};

const endIfWinner = (state) => {
  const alive = state.players.filter((player) => player.alive);
  if (alive.length === 1) {
    state.phase = 'over';
    addLog(state, `${alive[0].name} wins the game.`);
    return true;
  }
  return false;
};

const startGame = (state) => {
  state.phase = 'playing';
  state.counter = 0;
  state.pile = [];
  state.skipNext = false;
  state.pendingQueen = null;
  state.pendingKing = null;
  state.pendingKill = null;
  state.log = [`Game started with ${state.players.length} players.`];
  state.players = state.players.map((player) => ({
    ...player,
    alive: true,
    hand: [],
  }));
  state.players.forEach((player) => {
    for (let i = 0; i < STARTING_HAND; i += 1) {
      drawToPlayer(state, player.id);
    }
  });
  state.currentPlayerId = state.players[0]?.id ?? null;
};

const playCardAndAdvance = (state, card, playerId, counterDelta, newCounterValue) => {
  state.pile.push(card);
  removeCardFromHand(state.players, playerId, card.id);
  if (counterDelta !== 0) {
    state.counter += counterDelta;
  } else if (newCounterValue !== null) {
    state.counter = newCounterValue;
  }
  drawToPlayer(state, playerId);
  advanceTurnFrom(state, playerId);
};

const ensurePlayableOrEliminate = (state) => {
  if (state.phase !== 'playing') return;
  if (state.pendingQueen || state.pendingKing || state.pendingKill) return;
  const player = state.players.find((p) => p.id === state.currentPlayerId);
  if (!player || !player.alive) return;
  const playable = player.hand.some((card) => isCardPlayable(card, state.counter));
  if (!playable) {
    eliminatePlayer(state, player.id, `No playable cards without exceeding ${MAX_COUNTER}.`);
    if (endIfWinner(state)) return;
    advanceTurnFrom(state, player.id);
  }
};

const applyAction = (state, action) => {
  const nextState = cloneState(state);
  if (nextState.phase === 'over' && action.type !== 'restart_game') {
    return nextState;
  }

  if (action.type === 'start_game') {
    if (nextState.phase === 'lobby' || nextState.phase === 'over') {
      startGame(nextState);
    }
    return nextState;
  }

  if (action.type === 'restart_game') {
    nextState.phase = 'lobby';
    nextState.counter = 0;
    nextState.pile = [];
    nextState.pendingQueen = null;
    nextState.pendingKing = null;
    nextState.pendingKill = null;
    nextState.skipNext = false;
    nextState.currentPlayerId = null;
    nextState.log = ['Lobby reset.'];
    nextState.players = nextState.players.map((player) => ({
      ...player,
      alive: true,
      hand: [],
    }));
    return nextState;
  }

  if (action.type === 'play_card') {
    if (nextState.pendingQueen || nextState.pendingKing || nextState.pendingKill) return nextState;
    if (nextState.currentPlayerId !== action.playerId) return nextState;
    const player = nextState.players.find((p) => p.id === action.playerId);
    const card = player?.hand.find((c) => c.id === action.cardId);
    if (!player || !card) return nextState;
    if (!isCardPlayable(card, nextState.counter)) return nextState;

    if (card.rank === 'Q') {
      nextState.pendingQueen = { card, playerId: player.id };
      return nextState;
    }
    if (card.rank === 'K') {
      nextState.pendingKing = { card, playerId: player.id };
      return nextState;
    }
    if (card.rank === 'J') {
      addLog(nextState, `${player.name} played a Jack. Next player is skipped.`);
      nextState.skipNext = true;
      playCardAndAdvance(nextState, card, player.id, 0, null);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }
    if (isAceOfSpades(card)) {
      addLog(nextState, `${player.name} played the Ace of Spades. Counter resets to 0.`);
      playCardAndAdvance(nextState, card, player.id, 0, 0);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }
    if (card.rank === '4') {
      addLog(nextState, `${player.name} played a 4.`);
      playCardAndAdvance(nextState, card, player.id, 4, null);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }
    if (card.rank === 'A') {
      addLog(nextState, `${player.name} played an Ace for 1.`);
      playCardAndAdvance(nextState, card, player.id, 1, null);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }
    if (isNumberRank(card.rank)) {
      const value = Number(card.rank);
      addLog(nextState, `${player.name} played ${card.rank}${card.suit} for ${value}.`);
      playCardAndAdvance(nextState, card, player.id, value, null);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }
  }

  if (action.type === 'queen_choice') {
    const pending = nextState.pendingQueen;
    if (!pending || pending.playerId !== action.playerId) return nextState;
    const delta = action.direction === 'up' ? 30 : -30;
    const nextCounter = Math.max(0, nextState.counter + delta);
    const player = nextState.players.find((p) => p.id === action.playerId);
    if (!player) return nextState;
    addLog(
      nextState,
      `${player.name} played a Queen. Counter ${delta > 0 ? 'increases' : 'decreases'} by 30.`
    );
    nextState.pendingQueen = null;
    playCardAndAdvance(nextState, pending.card, player.id, 0, nextCounter);
    ensurePlayableOrEliminate(nextState);
    return nextState;
  }

  if (action.type === 'king_target') {
    const pending = nextState.pendingKing;
    if (!pending || pending.playerId !== action.playerId) return nextState;
    const attacker = nextState.players.find((p) => p.id === pending.playerId);
    const target = nextState.players.find((p) => p.id === action.targetId);
    if (!attacker || !target || !target.alive || attacker.id === target.id) return nextState;
    removeCardFromHand(nextState.players, attacker.id, pending.card.id);
    nextState.pile.push(pending.card);
    drawToPlayer(nextState, attacker.id);
    nextState.pendingKing = null;
    nextState.pendingKill = { attackerId: attacker.id, targetId: target.id };
    addLog(nextState, `${attacker.name} played a King and targeted ${target.name}.`);
    return nextState;
  }

  if (action.type === 'kill_response') {
    const pending = nextState.pendingKill;
    if (!pending) return nextState;
    if (pending.targetId !== action.playerId) return nextState;
    const attacker = nextState.players.find((p) => p.id === pending.attackerId);
    const target = nextState.players.find((p) => p.id === pending.targetId);
    if (!attacker || !target || !target.alive) {
      nextState.pendingKill = null;
      return nextState;
    }

    if (!action.cardId) {
      eliminatePlayer(nextState, target.id, 'No response to the kill.');
      nextState.pendingKill = null;
      if (endIfWinner(nextState)) return nextState;
      advanceTurnFrom(nextState, attacker.id);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }

    const responseCard = target.hand.find((card) => card.id === action.cardId);
    if (!responseCard || !['K', 'J', '4'].includes(responseCard.rank)) return nextState;

    nextState.pile.push(responseCard);
    removeCardFromHand(nextState.players, target.id, responseCard.id);
    drawToPlayer(nextState, target.id);

    if (responseCard.rank === 'K') {
      addLog(nextState, `${target.name} countered with a King. ${attacker.name} is eliminated.`);
      eliminatePlayer(nextState, attacker.id, 'Killed by a King counter.');
      nextState.pendingKill = null;
      if (endIfWinner(nextState)) return nextState;
      advanceTurnFrom(nextState, attacker.id);
      ensurePlayableOrEliminate(nextState);
      return nextState;
    }

    if (responseCard.rank === 'J') {
      const targetIndex = nextState.players.findIndex((p) => p.id === target.id);
      let nextIndex = getNextAliveIndex(targetIndex, nextState.players);
      if (nextIndex >= 0) {
        // Jack skips the next target in the kill chain.
        const skippedIndex = getNextAliveIndex(nextIndex, nextState.players);
        if (skippedIndex >= 0) {
          nextIndex = skippedIndex;
        }
      }
      const nextTargetId = nextState.players[nextIndex]?.id ?? null;
      if (!nextTargetId) {
        nextState.pendingKill = null;
        return nextState;
      }
      const nextTarget = nextState.players.find((p) => p.id === nextTargetId);
      addLog(
        nextState,
        `${target.name} played a Jack. The next target is skipped and the kill shifts to ${nextTarget.name}.`
      );
      nextState.pendingKill = { attackerId: attacker.id, targetId: nextTargetId };
      return nextState;
    }

    if (responseCard.rank === '4') {
      addLog(nextState, `${target.name} played a 4 to reflect the kill back to ${attacker.name}.`);
      nextState.pendingKill = { attackerId: attacker.id, targetId: attacker.id };
      return nextState;
    }
  }

  return nextState;
};

module.exports = {
  applyAction,
  startGame,
  createLobbyState(players, hostId) {
    return {
      phase: 'lobby',
      hostId,
      players,
      pile: [],
      counter: 0,
      currentPlayerId: null,
      skipNext: false,
      pendingQueen: null,
      pendingKing: null,
      pendingKill: null,
      log: ['Waiting for players.'],
      nextCardId: 1,
    };
  },
};
