import "./index.css";
import Card from "../Card";

function PlayingPanel({
  gameState,
  playerId,
  currentPlayer,
  localPlayer,
  alivePlayers,
  responseOptions,
  playableIds,
  sendAction,
  leaveRoom,
  isAceOfSpades,
  maxCounter,
}) {
  return (
    <main className="game-grid">
      <section className="meta-card">
        <div>
          <span className="meta-label">Counter</span>
          <strong className="meta-value">
            {gameState ? gameState.counter : 0}
          </strong>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          {currentPlayer?.id === playerId ? (
            <h2>Your turn</h2>
          ) : (
            <h2>Waiting for {currentPlayer?.name}</h2>
          )}
        </div>
        {gameState.pendingKill && (
          <div className="kill-panel">
            <h3>Kill in progress</h3>
            <p>
              {gameState.players.find(
                (player) => player.id === gameState.pendingKill.attackerId,
              )?.name ?? "Attacker"}{" "}
              is targeting{" "}
              {gameState.players.find(
                (player) => player.id === gameState.pendingKill.targetId,
              )?.name ?? "Target"}
              .
            </p>
            <div className="hand">
              {!localPlayer && (
                <p className="muted">Waiting for your hand.</p>
              )}
              {localPlayer &&
                (() => {
                  const canRespond = gameState.pendingKill.targetId === playerId;
                  const responseIds = new Set(
                    responseOptions.map((card) => card.id),
                  );

                  if (responseOptions.length === 0 && canRespond) {
                    return (
                      <p className="muted">No response cards available.</p>
                    );
                  }

                  return localPlayer.hand.map((card) => {
                    const isResponseCard = responseIds.has(card.id);
                    const isDisabled = !canRespond || !isResponseCard;
                    const footer = isResponseCard
                      ? `Use ${card.rank}`
                      : "";

                    return (
                      <Card
                        key={card.id}
                        card={card}
                        onClick={() =>
                          sendAction({
                            type: "kill_response",
                            playerId,
                            cardId: card.id,
                          })
                        }
                        disabled={isDisabled}
                        isSpecial={isResponseCard}
                        footer={footer}
                      />
                    );
                  });
                })()}
            </div>
            {gameState.pendingKill.targetId === playerId ? (
              <button
                type="button"
                className="danger-button"
                onClick={() =>
                  sendAction({
                    type: "kill_response",
                    playerId,
                    cardId: null,
                  })
                }
              >
                Accept the kill
              </button>
            ) : (
              <p className="muted">
                Waiting for{" "}
                {gameState.players.find(
                  (p) => p.id === gameState.pendingKill.targetId,
                )?.name ?? "Target"}{" "}
                to respond...
              </p>
            )}
          </div>
        )}

        {gameState.pendingQueen &&
          gameState.pendingQueen.playerId === playerId && (
            <div className="choice-panel">
              <h3>Queen choice</h3>
              <p>Choose how to apply the Queen.</p>
              <div className="panel-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    sendAction({
                      type: "queen_choice",
                      playerId,
                      direction: "up",
                    })
                  }
                  disabled={gameState.counter + 30 > maxCounter}
                >
                  Add 30
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    sendAction({
                      type: "queen_choice",
                      playerId,
                      direction: "down",
                    })
                  }
                  disabled={gameState.counter - 30 < 0}
                >
                  Subtract 30
                </button>
              </div>
            </div>
          )}

        {gameState.pendingKing &&
          gameState.pendingKing.playerId === playerId && (
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
                      onClick={() =>
                        sendAction({
                          type: "king_target",
                          playerId,
                          targetId: player.id,
                        })
                      }
                    >
                      {player.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

        {!gameState.pendingKill &&
          (!gameState.pendingQueen ||
            gameState.pendingQueen.playerId !== playerId) &&
          (!gameState.pendingKing ||
            gameState.pendingKing.playerId !== playerId) &&
          localPlayer && (
            <>
              <div className="hand">
                {localPlayer.hand.map((card) => {
                  const subtitle =
                    card.rank === "K"
                      ? "Kill"
                      : card.rank === "Q"
                        ? "+/-30"
                        : card.rank === "J"
                          ? "Skip"
                          : card.rank === "4"
                            ? "4"
                            : isAceOfSpades(card)
                              ? "Reset"
                              : "Play";
                  const isSpecial =
                    ["K", "Q", "J"].includes(card.rank) || isAceOfSpades(card);
                  const isDisabled =
                    !playableIds.has(card.id) ||
                    gameState.currentPlayerId !== playerId;

                  return (
                    <Card
                      key={card.id}
                      card={card}
                      onClick={() =>
                        sendAction({
                          type: "play_card",
                          playerId,
                          cardId: card.id,
                        })
                      }
                      disabled={isDisabled}
                      isSpecial={isSpecial}
                      footer={subtitle}
                    />
                  );
                })}
              </div>
              <p className="muted">
                Each play draws a new card so you stay at 2 in hand.
              </p>
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
              className={`player-card ${player.id === gameState.currentPlayerId ? "active" : ""} ${player.alive ? "" : "out"}`}
            >
              <div>
                <strong>{player.name}</strong>
                <span>{player.alive ? "Alive" : "Eliminated"}</span>
              </div>
              <div className="player-meta">
                <span>{player.hand.length} cards</span>
                {player.id === playerId && <span className="tag">You</span>}
                {player.id === gameState.currentPlayerId && (
                  <span className="tag">Current</span>
                )}
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
          {gameState.log.length === 0 && (
            <p className="muted">No actions yet.</p>
          )}
          {gameState.log.map((entry, index) => (
            <p key={`${entry}-${index}`}>{entry}</p>
          ))}
        </div>
      </section>

      <section className="panel footer-panel">
        <button type="button" className="ghost-button" onClick={leaveRoom}>
          Leave room
        </button>
      </section>
    </main>
  );
}

export default PlayingPanel;
