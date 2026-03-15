import { useEffect, useMemo, useState } from 'react';
import './App.css';

const MAX_COUNTER = 100;
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

const isAceOfSpades = (card) => card.rank === 'A' && card.suit === 'S';
const isNumberRank = (rank) => /^[0-9]+$/.test(rank);
const cardLabel = (card) => `${card.rank}${card.suit}`;

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

function App() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [nameInput, setNameInput] = useState('Player');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  const connect = (mode) => {
    setError('');
    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      if (mode === 'create') {
        ws.send(JSON.stringify({ type: 'create_room', name: nameInput }));
      } else {
        ws.send(JSON.stringify({ type: 'join_room', name: nameInput, code: roomCodeInput }));
      }
    };
    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (message.type === 'room_error') {
        setError(message.message || 'Unable to join room.');
        setConnectionStatus('disconnected');
        ws.close();
        return;
      }
      if (message.type === 'room_joined') {
        setRoomCode(message.code);
        setPlayerId(message.playerId);
        setGameState(message.state);
        setConnectionStatus('connected');
        return;
      }
      if (message.type === 'state_update') {
        setGameState(message.state);
      }
    };
    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setSocket(null);
    };
    setSocket(ws);
  };

  const leaveRoom = () => {
    if (socket) {
      socket.close();
    }
    setRoomCode('');
    setPlayerId(null);
    setGameState(null);
    setConnectionStatus('disconnected');
  };

  const sendAction = (action) => {
    if (!socket || connectionStatus !== 'connected') return;
    socket.send(JSON.stringify({ type: 'action', roomCode, action }));
  };

  const currentPlayer = gameState?.players?.find((player) => player.id === gameState.currentPlayerId);
  const localPlayer = gameState?.players?.find((player) => player.id === playerId);
  const isHost = gameState?.hostId === playerId;
  const alivePlayers = useMemo(
    () => (gameState ? gameState.players.filter((player) => player.alive) : []),
    [gameState]
  );

  const playableIds = useMemo(() => {
    if (!gameState || !localPlayer) return new Set();
    return new Set(getPlayableCards(localPlayer, gameState.counter).map((card) => card.id));
  }, [gameState, localPlayer]);

  const responseOptions = useMemo(() => {
    if (!gameState?.pendingKill) return [];
    const target = gameState.players.find((player) => player.id === gameState.pendingKill.targetId);
    if (!target) return [];
    return target.hand.filter((card) => ['K', 'J', '4'].includes(card.rank));
  }, [gameState]);

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
            <strong className="meta-value">{gameState ? gameState.counter : 0}</strong>
          </div>
          <div>
            <span className="meta-label">Deck</span>
            <strong className="meta-value">Unlimited</strong>
          </div>
          <div>
            <span className="meta-label">Pile</span>
            <strong className="meta-value">{gameState ? gameState.pile.length : 0}</strong>
          </div>
        </div>
      </header>

      {connectionStatus !== 'connected' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Join with a room code</h2>
            <p>Create a room and share the code with friends.</p>
          </div>
          <div className="player-config">
            <div className="player-row">
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                aria-label="Your name"
                placeholder="Your name"
              />
            </div>
            <div className="player-row">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                aria-label="Room code"
                placeholder="Room code"
              />
            </div>
          </div>
          {error && <p className="muted">{error}</p>}
          <div className="panel-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => connect('join')}
              disabled={connectionStatus === 'connecting' || roomCodeInput.length < 4}
            >
              Join room
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => connect('create')}
              disabled={connectionStatus === 'connecting'}
            >
              Create room
            </button>
          </div>
        </section>
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'lobby' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Lobby</h2>
            <p>Share this room code with your players.</p>
          </div>
          <div className="room-code">
            <span className="meta-label">Room code</span>
            <strong>{roomCode}</strong>
          </div>
          <div className="player-list">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`player-card ${player.id === playerId ? 'active' : ''} ${player.connected ? '' : 'out'}`}
              >
                <div>
                  <strong>{player.name}</strong>
                  <span>{player.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="player-meta">
                  {player.id === playerId && <span className="tag">You</span>}
                  {player.id === gameState.hostId && <span className="tag">Host</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-button" onClick={leaveRoom}>
              Leave room
            </button>
            <button type="button" className="primary-button" onClick={() => sendAction({ type: 'start_game' })} disabled={!isHost}>
              Start game
            </button>
          </div>
          {!isHost && <p className="muted">Waiting for the host to start the game.</p>}
        </section>
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'playing' && (
        <main className="game-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Current turn</h2>
              <p>{currentPlayer ? `${currentPlayer.name} is up.` : 'Waiting for next player.'}</p>
            </div>
            {gameState.pendingKill && (
              <div className="kill-panel">
                <h3>Kill in progress</h3>
                <p>
                  {gameState.players.find((player) => player.id === gameState.pendingKill.attackerId)?.name ?? 'Attacker'} is targeting{' '}
                  {gameState.players.find((player) => player.id === gameState.pendingKill.targetId)?.name ?? 'Target'}.
                </p>
                <div className="hand">
                  {responseOptions.length === 0 && <p className="muted">No response cards available.</p>}
                  {responseOptions.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className="card-button special"
                      onClick={() => sendAction({ type: 'kill_response', playerId, cardId: card.id })}
                      disabled={gameState.pendingKill.targetId !== playerId}
                    >
                      {cardLabel(card)}
                      <span>Use {card.rank}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => sendAction({ type: 'kill_response', playerId, cardId: null })}
                  disabled={gameState.pendingKill.targetId !== playerId}
                >
                  Accept the kill
                </button>
              </div>
            )}

            {gameState.pendingQueen && gameState.pendingQueen.playerId === playerId && (
              <div className="choice-panel">
                <h3>Queen choice</h3>
                <p>Choose how to apply the Queen.</p>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => sendAction({ type: 'queen_choice', playerId, direction: 'up' })}
                    disabled={gameState.counter + 30 > MAX_COUNTER}
                  >
                    Add 30
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => sendAction({ type: 'queen_choice', playerId, direction: 'down' })}
                    disabled={gameState.counter - 30 < 0}
                  >
                    Subtract 30
                  </button>
                </div>
              </div>
            )}

            {gameState.pendingKing && gameState.pendingKing.playerId === playerId && (
              <div className="choice-panel">
                <h3>Choose a target</h3>
                <p>Pick a player to kill with the King.</p>
                <div className="target-grid">
                  {gameState.players
                    .filter((player) => player.alive && player.id !== playerId)
                    .map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="ghost-button"
                        onClick={() => sendAction({ type: 'king_target', playerId, targetId: player.id })}
                      >
                        {player.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {!gameState.pendingKill &&
              (!gameState.pendingQueen || gameState.pendingQueen.playerId !== playerId) &&
              (!gameState.pendingKing || gameState.pendingKing.playerId !== playerId) &&
              localPlayer && (
                <>
                  <div className="hand">
                    {localPlayer.hand.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className={`card-button ${playableIds.has(card.id) ? '' : 'disabled'} ${
                          ['K', 'Q', 'J'].includes(card.rank) || isAceOfSpades(card) ? 'special' : ''
                        }`}
                        onClick={() => sendAction({ type: 'play_card', playerId, cardId: card.id })}
                        disabled={!playableIds.has(card.id) || gameState.currentPlayerId !== playerId}
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
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className={`player-card ${player.id === gameState.currentPlayerId ? 'active' : ''} ${
                    player.alive ? '' : 'out'
                  }`}
                >
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.alive ? 'Alive' : 'Eliminated'}</span>
                  </div>
                  <div className="player-meta">
                    <span>{player.hand.length} cards</span>
                    {player.id === playerId && <span className="tag">You</span>}
                    {player.id === gameState.currentPlayerId && <span className="tag">Current</span>}
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
              {gameState.log.length === 0 && <p className="muted">No actions yet.</p>}
              {gameState.log.map((entry, index) => (
                <p key={`${entry}-${index}`}>{entry}</p>
              ))}
            </div>
          </section>
        </main>
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'over' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Game over</h2>
            <p>{alivePlayers[0]?.name ?? 'A player'} is the winner.</p>
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-button" onClick={leaveRoom}>
              Leave room
            </button>
            <button type="button" className="primary-button" onClick={() => sendAction({ type: 'restart_game' })} disabled={!isHost}>
              Reset to lobby
            </button>
          </div>
        </section>
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'playing' && (
        <section className="panel footer-panel">
          <div>
            <h3>Quick rules recap</h3>
            <p>
              Stay at or under {MAX_COUNTER}. King targets a player. Queen is plus or minus 30. Jack skips the next
              turn. 4 plays as 4 or reflects a King when targeted. Ace of Spades resets the counter.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={leaveRoom}>
            Leave room
          </button>
        </section>
      )}
    </div>
  );
}

export default App;
