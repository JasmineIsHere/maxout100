import "./index.css";

function LobbyPanel({
  gameState,
  playerId,
  roomCode,
  isHost,
  leaveRoom,
  sendAction,
}) {
  const numPlayers = gameState?.players.length || 0;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Lobby</h2>
        <p>Share this room code with other players to start the game.</p>
      </div>
      <div className="room-code">
        <span className="meta-label">Room code</span>
        <strong>{roomCode}</strong>
      </div>
      <div className="player-list">
        {gameState.players.map((player) => (
          <div
            key={player.id}
            className={`player-card ${player.id === playerId ? "active" : ""} ${player.connected ? "" : "out"}`}
          >
            <div>
              <strong>{player.name}</strong>
              <span>{player.connected ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="player-meta">
              {player.id === playerId && <span className="tag">You</span>}
              {player.id === gameState.hostId && (
                <span className="tag">Host</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="panel-actions">
        <button type="button" className="ghost-button" onClick={leaveRoom}>
          Leave room
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => sendAction({ type: "start_game" })}
          disabled={!isHost || numPlayers < 2}
        >
          Start game
        </button>
      </div>
      {!isHost && (
        <p className="muted">Waiting for the host to start the game.</p>
      )}
    </section>
  );
}

export default LobbyPanel;
