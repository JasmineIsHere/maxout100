import './index.css';

function JoinPanel({
  nameInput,
  setNameInput,
  roomCodeInput,
  setRoomCodeInput,
  error,
  connectionStatus,
  connect,
}) {
  return (
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
            required
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
          disabled={connectionStatus === 'connecting' || roomCodeInput.length < 4 || !nameInput.trim()}
        >
          Join room
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => connect('create')}
          disabled={connectionStatus === 'connecting' || !nameInput.trim()}
        >
          Create room
        </button>
      </div>
    </section>
  );
}

export default JoinPanel;
