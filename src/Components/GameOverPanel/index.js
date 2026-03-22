import "./index.css";

function GameOverPanel({ alivePlayers, leaveRoom, sendAction, isHost }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Game over</h2>
        <p>{alivePlayers[0]?.name ?? "A player"} is the winner.</p>
      </div>
      <div className="panel-actions">
        <button type="button" className="ghost-button" onClick={leaveRoom}>
          Leave room
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => sendAction({ type: "restart_game" })}
          disabled={!isHost}
        >
          Reset to lobby
        </button>
      </div>
    </section>
  );
}

export default GameOverPanel;
