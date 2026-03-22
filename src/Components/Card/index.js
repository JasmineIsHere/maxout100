import './index.css';

const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const isNumberRank = (rank) => /^[0-9]+$/.test(rank);

const getPipColumns = (rank) => {
  const value = Number(rank);
  if (!Number.isFinite(value) || value < 2) return [];
  if (value === 2) return [2];
  if (value === 3) return [3];
  if (value === 4) return [2, 2];
  if (value === 5) return [2, 1, 2];
  if (value === 6) return [3, 3];
  if (value === 7) return [3, 1, 3];
  if (value === 8) return [3, 2, 3];
  if (value === 9) return [3, 3, 3];
  if (value === 10) return [4, 2, 4];
  return [];
};

function Card({ card, footer, onClick, disabled, isSpecial }) {
  const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const isRed = card.suit === 'H' || card.suit === 'D';
  const isNumber = isNumberRank(card.rank);
  const className = [
    'card-button',
    isSpecial ? 'special' : '',
    disabled ? 'disabled' : '',
    isRed ? 'red' : '',
    card.rank === '10' ? 'rank-10' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const pipColumns = isNumber ? getPipColumns(card.rank) : [];

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      <div className="card-corner card-corner-top">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
      <div className="card-center">
        {isNumber && pipColumns.length > 0 ? (
          <div className="card-pips columns">
            {pipColumns.map((count, columnIndex) => (
              <div key={`${card.rank}-col-${columnIndex}`} className={`pip-column pip-column-${count}`}>
                {Array.from({ length: count }).map((_, pipIndex) => (
                  <span key={`${card.id}-pip-${columnIndex}-${pipIndex}`} className="pip">
                    {suitSymbol}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-face">
            <span className="card-face-rank">{card.rank}</span>
            <span className="card-face-suit">{suitSymbol}</span>
          </div>
        )}
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </button>
  );
}

export default Card;
