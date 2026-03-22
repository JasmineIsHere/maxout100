import './index.css';

function AppHeader() {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Multiplayer Card Game</p>
        <h1>100 or Dead</h1>
        <h2>Instructions:</h2>
        <p className="subtitle">
          Each player has 2 cards on hand. On your turn, play a card to the pile to add to the counter and draw a card. The
          goal is to avoid the counter from exceeding 100. Some cards have special skills that can be used to influence the
          game.
          <br></br>
          <ul>
            <li>
              <strong>Number cards</strong> add their value to the counter.
            </li>
            <li>
              <strong>4</strong> can be played as 4 or to reflect a King back to the attacker.
            </li>
            <li>
              <strong>Jack</strong> skips the next player's turn.
            </li>
            <li>
              <strong>Queen</strong> allows you to add or subtract 30 from the counter.
            </li>
            <li>
              <strong>King</strong> lets you choose another player to add the card's value and skip their next turn.
            </li>
            <li>
              <strong>Ace of Spades</strong> resets the counter to 0.
            </li>
          </ul>
        </p>
      </div>
    </header>
  );
}

export default AppHeader;
