import { useEffect, useMemo, useState } from 'react';
import './App.css';

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;
const STARTING_HAND = 2;
const MAX_COUNTER = 100;

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const isAceOfSpades = (card) => card.rank === 'A' && card.suit === '♠️';
const isNumberRank = (rank) => /^[0-9]+$/.test(rank);

const cardLabel = (card) => `${card.rank}${card.suit}`;

let globalCardId = 0;

const drawCard = (deck, pile) => {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const card = { id: `${rank}${suit}-${globalCardId}`, rank, suit };
  globalCardId += 1;
  return { deck, pile, card };
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

const getPlayableCards = (player, counter) => {
  return player.hand.filter((card) => {
    if (card.rank === 'K' || card.rank === 'J') return true;
    if (card.rank === 'Q') return counter + 30 <= MAX_COUNTER || counter - 30 >= 0;
    if (isAceOfSpades(card)) return true;
    if (card.rank === '4') return counter + 4 <= MAX_COUNTER;
    if (card.rank === 'A') return counter + 1 <= MAX_COUNTER;
    if (isNumberRank(card.rank)) return counter + Number(card.rank) <= MAX_COUNTER;
    return false;
  });
};

const createPlayerConfigs = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `cfg-${index}`,
    name: `Player ${index + 1}`,
  }));

function App() {
  const [gamePhase, setGamePhase] = useState('setup');
  const [playerConfigs, setPlayerConfigs] = useState(() => createPlayerConfigs(4));
  const [players, setPlayers] = useState([]);
  const [deck, setDeck] = useState(null);
  const [pile, setPile] = useState([]);
  const [counter, setCounter] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [skipNext, setSkipNext] = useState(false);
  const [pendingQueen, setPendingQueen] = useState(null);
  const [pendingKing, setPendingKing] = useState(null);
  const [pendingKill, setPendingKill] = useState(null);
  const [log, setLog] = useState([]);

  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players]);
  const currentPlayer = players.find((player) => player.id === currentPlayerId);

  const addLog = (message) => {
    setLog((prev) => [message, ...prev]);
  };

  const resetGame = () => {
    setGamePhase('setup');
    setPlayers([]);
    setDeck(null);
    setPile([]);
    setCounter(0);
    setCurrentPlayerId(null);
    setSkipNext(false);
    setPendingQueen(null);
    setPendingKing(null);
    setPendingKill(null);
    setLog([]);
  };

  const startGame = () => {
    const trimmedConfigs = playerConfigs
      .slice(0, MAX_PLAYERS)
      .map((cfg, index) => ({
        id: `P${index + 1}`,
        name: cfg.name.trim() || `Player ${index + 1}`,
        hand: [],
        alive: true,
      }));
    let nextDeck = null;
    let nextPile = [];
    const nextPlayers = trimmedConfigs.map((player) => ({ ...player }));
    for (let round = 0; round < STARTING_HAND; round += 1) {
      nextPlayers.forEach((player) => {
        const draw = drawCard(nextDeck, nextPile);
        nextDeck = draw.deck;
        nextPile = draw.pile;
        if (draw.card) {
          player.hand.push(draw.card);
        }
      });
    }
    setPlayers(nextPlayers);
    setDeck(nextDeck);
    setPile(nextPile);
    setCounter(0);
    setCurrentPlayerId(nextPlayers[0]?.id ?? null);
    setGamePhase('playing');
    setLog([`Game started with ${nextPlayers.length} players.`]);
  };

  const applyDrawToPlayer = (playerId, workingDeck, workingPile, workingPlayers) => {
    const draw = drawCard(workingDeck, workingPile);
    const playerIndex = workingPlayers.findIndex((player) => player.id === playerId);
    if (playerIndex >= 0 && draw.card) {
      workingPlayers[playerIndex].hand.push(draw.card);
    }
    return {
      deck: draw.deck,
      pile: draw.pile,
      players: workingPlayers,
    };
  };

  const advanceTurnFrom = (fromPlayerId, workingPlayers, shouldSkipNext) => {
    if (workingPlayers.filter((player) => player.alive).length <= 1) {
      return { nextPlayerId: null, skipNextValue: false };
    }
    const startIndex = workingPlayers.findIndex((player) => player.id === fromPlayerId);
    let nextIndex = getNextAliveIndex(startIndex, workingPlayers);
    let nextSkip = shouldSkipNext;
    if (nextIndex >= 0 && nextSkip) {
      nextSkip = false;
      nextIndex = getNextAliveIndex(nextIndex, workingPlayers);
    }
    return { nextPlayerId: workingPlayers[nextIndex]?.id ?? null, skipNextValue: nextSkip };
  };

  const eliminatePlayer = (playerId, reason, workingPlayers) => {
    const nextPlayers = workingPlayers.map((player) =>
      player.id === playerId ? { ...player, alive: false } : player
    );
    const eliminated = nextPlayers.find((player) => player.id === playerId);
    if (eliminated) {
      addLog(`${eliminated.name} was eliminated. ${reason}`);
    }
    return nextPlayers;
  };

  const endIfWinner = (workingPlayers) => {
    const alive = workingPlayers.filter((player) => player.alive);
    if (alive.length === 1) {
      setGamePhase('over');
      addLog(`${alive[0].name} wins the game.`);
      return true;
    }
    return false;
  };

  const playCardAndAdvance = (card, playerId, counterDelta, newCounterValue) => {
    let nextDeck = deck;
    let nextPile = [...pile, card];
    const nextPlayers = players.map((player) =>
      player.id === playerId
        ? { ...player, hand: player.hand.filter((handCard) => handCard.id !== card.id) }
        : { ...player }
    );
    if (counterDelta !== 0) {
      setCounter(counter + counterDelta);
    } else if (newCounterValue !== null) {
      setCounter(newCounterValue);
    }
    let updated = applyDrawToPlayer(playerId, nextDeck, nextPile, nextPlayers);
    nextDeck = updated.deck;
    nextPile = updated.pile;

    const advance = advanceTurnFrom(playerId, updated.players, skipNext);
    setPlayers(updated.players);
    setDeck(nextDeck);
    setPile(nextPile);
    setSkipNext(advance.skipNextValue);
    setCurrentPlayerId(advance.nextPlayerId);
  };

  const handlePlayCard = (card) => {
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) return;
    if (pendingKill || pendingQueen || pendingKing) return;

    if (card.rank === 'Q') {
      setPendingQueen({ card, playerId: currentPlayer.id });
      return;
    }
    if (card.rank === 'K') {
      setPendingKing({ card, playerId: currentPlayer.id });
      return;
    }
    if (card.rank === 'J') {
      addLog(`${currentPlayer.name} played a Jack. Next player is skipped.`);
      setSkipNext(true);
      playCardAndAdvance(card, currentPlayer.id, 0, null);
      return;
    }
    if (isAceOfSpades(card)) {
      addLog(`${currentPlayer.name} played the Ace of Spades. Counter resets to 0.`);
      playCardAndAdvance(card, currentPlayer.id, 0, 0);
      return;
    }
    if (card.rank === '4') {
      addLog(`${currentPlayer.name} played a 4.`);
      playCardAndAdvance(card, currentPlayer.id, 4, null);
      return;
    }
    if (card.rank === 'A') {
      addLog(`${currentPlayer.name} played an Ace for 1.`);
      playCardAndAdvance(card, currentPlayer.id, 1, null);
      return;
    }
    if (isNumberRank(card.rank)) {
      const value = Number(card.rank);
      addLog(`${currentPlayer.name} played ${cardLabel(card)} for ${value}.`);
      playCardAndAdvance(card, currentPlayer.id, value, null);
    }
  };

  const resolveQueen = (direction) => {
    if (!pendingQueen) return;
    const { card, playerId } = pendingQueen;
    const delta = direction === 'up' ? 30 : -30;
    const nextCounter = Math.max(0, counter + delta);
    addLog(
      `${players.find((player) => player.id === playerId)?.name ?? 'Player'} played a Queen. Counter ${
        delta > 0 ? 'increases' : 'decreases'
      } by 30.`
    );
    setPendingQueen(null);
    playCardAndAdvance(card, playerId, 0, nextCounter);
  };

  const selectKingTarget = (targetId) => {
    if (!pendingKing) return;
    const { card, playerId } = pendingKing;
    const attacker = players.find((player) => player.id === playerId);
    const target = players.find((player) => player.id === targetId);
    if (!attacker || !target) return;
    let nextDeck = deck;
    let nextPile = [...pile, card];
    const nextPlayers = players.map((player) =>
      player.id === playerId
        ? { ...player, hand: player.hand.filter((handCard) => handCard.id !== card.id) }
        : { ...player }
    );
    const updated = applyDrawToPlayer(playerId, nextDeck, nextPile, nextPlayers);
    setPlayers(updated.players);
    setDeck(updated.deck);
    setPile(updated.pile);
    setPendingKing(null);
    setPendingKill({ attackerId: playerId, targetId });
    addLog(`${attacker.name} played a King and targeted ${target.name}.`);
  };

  const resolveKillResponse = (responseCard) => {
    if (!pendingKill) return;
    const { attackerId, targetId } = pendingKill;
    const attacker = players.find((player) => player.id === attackerId);
    const target = players.find((player) => player.id === targetId);
    if (!attacker || !target || !target.alive) {
      setPendingKill(null);
      return;
    }

    let nextDeck = deck;
    let nextPile = [...pile];
    let nextPlayers = players.map((player) => ({ ...player }));

    const removeResponseCard = () => {
      if (!responseCard) return;
      nextPile = [...nextPile, responseCard];
      nextPlayers = nextPlayers.map((player) =>
        player.id === targetId
          ? { ...player, hand: player.hand.filter((handCard) => handCard.id !== responseCard.id) }
          : player
      );
      const updated = applyDrawToPlayer(targetId, nextDeck, nextPile, nextPlayers);
      nextDeck = updated.deck;
      nextPile = updated.pile;
      nextPlayers = updated.players;
    };

    if (!responseCard) {
      nextPlayers = eliminatePlayer(targetId, 'No response to the kill.', nextPlayers);
      setPendingKill(null);
      setPlayers(nextPlayers);
      setDeck(nextDeck);
      setPile(nextPile);
      if (endIfWinner(nextPlayers)) return;
      const advance = advanceTurnFrom(attackerId, nextPlayers, skipNext);
      setSkipNext(advance.skipNextValue);
      setCurrentPlayerId(advance.nextPlayerId);
      return;
    }

    if (responseCard.rank === 'K') {
      removeResponseCard();
      addLog(`${target.name} countered with a King. ${attacker.name} is eliminated.`);
      nextPlayers = eliminatePlayer(attackerId, 'Killed by a King counter.', nextPlayers);
      setPendingKill(null);
      setPlayers(nextPlayers);
      setDeck(nextDeck);
      setPile(nextPile);
      if (endIfWinner(nextPlayers)) return;
      const advance = advanceTurnFrom(attackerId, nextPlayers, skipNext);
      setSkipNext(advance.skipNextValue);
      setCurrentPlayerId(advance.nextPlayerId);
      return;
    }

    if (responseCard.rank === 'J') {
      removeResponseCard();
      const targetIndex = nextPlayers.findIndex((player) => player.id === targetId);
      const nextIndex = getNextAliveIndex(targetIndex, nextPlayers);
      const nextTargetId = nextPlayers[nextIndex]?.id ?? null;
      if (!nextTargetId) {
        setPendingKill(null);
        setPlayers(nextPlayers);
        setDeck(nextDeck);
        setPile(nextPile);
        return;
      }
      const nextTarget = nextPlayers.find((player) => player.id === nextTargetId);
      addLog(`${target.name} played a Jack. The kill shifts to ${nextTarget.name}.`);
      setPendingKill({ attackerId, targetId: nextTargetId });
      setPlayers(nextPlayers);
      setDeck(nextDeck);
      setPile(nextPile);
      return;
    }

    if (responseCard.rank === '4') {
      removeResponseCard();
      addLog(`${target.name} played a 4 to reflect the kill back to ${attacker.name}.`);
      setPendingKill({ attackerId, targetId: attackerId });
      setPlayers(nextPlayers);
      setDeck(nextDeck);
      setPile(nextPile);
    }
  };

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (pendingKill || pendingQueen || pendingKing) return;
    if (!currentPlayer || !currentPlayer.alive) return;
    const playable = getPlayableCards(currentPlayer, counter);
    if (playable.length === 0) {
      const nextPlayers = eliminatePlayer(
        currentPlayer.id,
        `No playable cards without exceeding ${MAX_COUNTER}.`,
        players
      );
      setPlayers(nextPlayers);
      if (endIfWinner(nextPlayers)) return;
      const advance = advanceTurnFrom(currentPlayer.id, nextPlayers, skipNext);
      setSkipNext(advance.skipNextValue);
      setCurrentPlayerId(advance.nextPlayerId);
    }
  }, [
    gamePhase,
    pendingKill,
    pendingQueen,
    pendingKing,
    currentPlayer,
    counter,
    players,
    skipNext,
  ]);

  const canStartGame = playerConfigs.length >= MIN_PLAYERS;

  const updatePlayerConfig = (index, value) => {
    setPlayerConfigs((prev) =>
      prev.map((player, idx) => (idx === index ? { ...player, name: value } : player))
    );
  };

  const addPlayerConfig = () => {
    if (playerConfigs.length >= MAX_PLAYERS) return;
    setPlayerConfigs((prev) => [
      ...prev,
      { id: `cfg-${prev.length}`, name: `Player ${prev.length + 1}` },
    ]);
  };

  const removePlayerConfig = (index) => {
    if (playerConfigs.length <= MIN_PLAYERS) return;
    setPlayerConfigs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const playableIds = useMemo(() => {
    if (!currentPlayer) return new Set();
    return new Set(getPlayableCards(currentPlayer, counter).map((card) => card.id));
  }, [currentPlayer, counter]);

  const responseOptions = useMemo(() => {
    if (!pendingKill) return [];
    const target = players.find((player) => player.id === pendingKill.targetId);
    if (!target) return [];
    return target.hand.filter((card) => ['K', 'J', '4'].includes(card.rank));
  }, [pendingKill, players]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Multiplayer Card Game</p>
          <h1>100 or Dead</h1>
          <p className="subtitle">Play to build the pile without breaking 100. Kings and tricks swing the table.</p>
        </div>
        <div className="meta-card">
          <div>
            <span className="meta-label">Counter</span>
            <strong className="meta-value">{counter}</strong>
          </div>
          <div>
            <span className="meta-label">Deck</span>
            <strong className="meta-value">{deck === null ? 'Unlimited' : deck.length}</strong>
          </div>
          <div>
            <span className="meta-label">Pile</span>
            <strong className="meta-value">{pile.length}</strong>
          </div>
        </div>
      </header>

      {gamePhase === 'setup' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Set up the table</h2>
            <p>2 to 10 players. Everyone starts with 2 cards.</p>
          </div>
          <div className="player-config">
            {playerConfigs.map((player, index) => (
              <div className="player-row" key={player.id}>
                <input
                  type="text"
                  value={player.name}
                  onChange={(event) => updatePlayerConfig(index, event.target.value)}
                  aria-label={`Player ${index + 1} name`}
                />
                <span className="player-tag">Seat {index + 1}</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => removePlayerConfig(index)}
                  disabled={playerConfigs.length <= MIN_PLAYERS}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-button" onClick={addPlayerConfig}>
              Add player
            </button>
            <button type="button" className="primary-button" onClick={startGame} disabled={!canStartGame}>
              Start game
            </button>
          </div>
        </section>
      )}

      {gamePhase === 'playing' && (
        <main className="game-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Current turn</h2>
              <p>{currentPlayer ? `${currentPlayer.name} is up.` : 'Waiting for next player.'}</p>
            </div>
            {pendingKill && (
              <div className="kill-panel">
                <h3>Kill in progress</h3>
                <p>
                  {players.find((player) => player.id === pendingKill.attackerId)?.name ?? 'Attacker'} is targeting{' '}
                  {players.find((player) => player.id === pendingKill.targetId)?.name ?? 'Target'}.
                </p>
                <div className="hand">
                  {responseOptions.length === 0 && <p className="muted">No response cards available.</p>}
                  {responseOptions.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className="card-button special"
                      onClick={() => resolveKillResponse(card)}
                    >
                      {cardLabel(card)}
                      <span>Use {card.rank}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="danger-button" onClick={() => resolveKillResponse(null)}>
                  Accept the kill
                </button>
              </div>
            )}

            {pendingQueen && (
              <div className="choice-panel">
                <h3>Queen choice</h3>
                <p>Choose how to apply the Queen.</p>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => resolveQueen('up')}
                    disabled={counter + 30 > MAX_COUNTER}
                  >
                    Add 30
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => resolveQueen('down')}
                    disabled={counter - 30 < 0}
                  >
                    Subtract 30
                  </button>
                </div>
              </div>
            )}

            {pendingKing && (
              <div className="choice-panel">
                <h3>Choose a target</h3>
                <p>Pick a player to kill with the King.</p>
                <div className="target-grid">
                  {players
                    .filter((player) => player.alive && player.id !== pendingKing.playerId)
                    .map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="ghost-button"
                        onClick={() => selectKingTarget(player.id)}
                      >
                        {player.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {!pendingKill && !pendingQueen && !pendingKing && currentPlayer && (
              <>
                <div className="hand">
                  {currentPlayer.hand.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`card-button ${playableIds.has(card.id) ? '' : 'disabled'} ${
                        ['K', 'Q', 'J'].includes(card.rank) || isAceOfSpades(card) ? 'special' : ''
                      }`}
                      onClick={() => handlePlayCard(card)}
                      disabled={!playableIds.has(card.id)}
                    >
                      {cardLabel(card)}
                      <span>
                        {card.rank === 'K'
                          ? 'Kill'
                          : card.rank === 'Q'
                          ? '+/-30'
                          : card.rank === 'J'
                          ? 'Skip'
                          : card.rank === '4'
                          ? '4'
                          : isAceOfSpades(card)
                          ? 'Reset'
                          : 'Play'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="muted">Each play draws a new card so you stay at 2 in hand.</p>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Players</h2>
              <p>{alivePlayers.length} still in the game.</p>
            </div>
            <div className="player-list">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`player-card ${player.id === currentPlayerId ? 'active' : ''} ${
                    player.alive ? '' : 'out'
                  }`}
                >
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.alive ? 'Alive' : 'Eliminated'}</span>
                  </div>
                  <div className="player-meta">
                    <span>{player.hand.length} cards</span>
                    {player.id === currentPlayerId && <span className="tag">Current</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel log-panel">
            <div className="panel-header">
              <h2>Table log</h2>
              <p>Latest plays and outcomes.</p>
            </div>
            <div className="log-list">
              {log.length === 0 && <p className="muted">No actions yet.</p>}
              {log.map((entry, index) => (
                <p key={`${entry}-${index}`}>{entry}</p>
              ))}
            </div>
          </section>
        </main>
      )}

      {gamePhase === 'over' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Game over</h2>
            <p>{alivePlayers[0]?.name ?? 'A player'} is the winner.</p>
          </div>
          <div className="panel-actions">
            <button type="button" className="primary-button" onClick={resetGame}>
              Reset game
            </button>
          </div>
        </section>
      )}

      {gamePhase === 'playing' && (
        <section className="panel footer-panel">
          <div>
            <h3>Quick rules recap</h3>
            <p>
              Stay at or under {MAX_COUNTER}. King targets a player. Queen is plus or minus 30. Jack skips the next
              turn. 4 plays as 4 or reflects a King when targeted. Ace of Spades resets the counter.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={resetGame}>
            Restart
          </button>
        </section>
      )}
    </div>
  );
}

export default App;
