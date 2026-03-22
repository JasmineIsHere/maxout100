import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AppHeader from './Components/AppHeader';
import JoinPanel from './Components/JoinPanel';
import LobbyPanel from './Components/LobbyPanel';
import PlayingPanel from './Components/PlayingPanel';
import GameOverPanel from './Components/GameOverPanel';

const MAX_COUNTER = 100;
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

const isAceOfSpades = (card) => card.rank === 'A' && card.suit === 'S';
const isNumberRank = (rank) => /^[0-9]+$/.test(rank);
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
  const [nameInput, setNameInput] = useState('');
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
    if (!nameInput.trim()) {
      setError('Please enter your name before continuing.');
      return;
    }
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
      <AppHeader />

      {connectionStatus !== 'connected' && (
        <JoinPanel
          nameInput={nameInput}
          setNameInput={setNameInput}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          error={error}
          connectionStatus={connectionStatus}
          connect={connect}
        />
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'lobby' && (
        <LobbyPanel
          gameState={gameState}
          playerId={playerId}
          roomCode={roomCode}
          isHost={isHost}
          leaveRoom={leaveRoom}
          sendAction={sendAction}
        />
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'playing' && (
        <PlayingPanel
          gameState={gameState}
          playerId={playerId}
          currentPlayer={currentPlayer}
          localPlayer={localPlayer}
          alivePlayers={alivePlayers}
          responseOptions={responseOptions}
          playableIds={playableIds}
          sendAction={sendAction}
          leaveRoom={leaveRoom}
          isAceOfSpades={isAceOfSpades}
          maxCounter={MAX_COUNTER}
        />
      )}

      {connectionStatus === 'connected' && gameState?.phase === 'over' && (
        <GameOverPanel alivePlayers={alivePlayers} leaveRoom={leaveRoom} sendAction={sendAction} isHost={isHost} />
      )}

    </div>
  );
}

export default App;
