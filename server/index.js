const http = require('http');
const WebSocket = require('ws');
const { applyAction, createLobbyState } = require('./gameEngine');

const PORT = process.env.PORT || 8080;

const rooms = new Map();
let nextPlayerId = 1;

const createRoomCode = () => {
  let code = Math.random().toString(36).substring(2, 6).toUpperCase();
  while (rooms.has(code)) {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  return code;
};

const broadcast = (room) => {
  const payload = JSON.stringify({ type: 'state_update', state: room.state });
  room.clients.forEach((playerId, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      ws.send(JSON.stringify({ type: 'room_error', message: 'Invalid message.' }));
      return;
    }

    if (data.type === 'create_room') {
      const name = (data.name || 'Player').trim() || 'Player';
      const playerId = `P${nextPlayerId}`;
      nextPlayerId += 1;
      const player = { id: playerId, name, hand: [], alive: true, connected: true };
      const code = createRoomCode();
      const room = {
        code,
        hostId: playerId,
        state: createLobbyState([player], playerId),
        clients: new Map(),
      };
      room.clients.set(ws, playerId);
      rooms.set(code, room);
      ws.send(
        JSON.stringify({
          type: 'room_joined',
          code,
          playerId,
          isHost: true,
          state: room.state,
        })
      );
      return;
    }

    if (data.type === 'join_room') {
      const code = (data.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        ws.send(JSON.stringify({ type: 'room_error', message: 'Room not found.' }));
        return;
      }
      if (room.state.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'room_error', message: 'Game already started.' }));
        return;
      }
      const name = (data.name || 'Player').trim() || 'Player';
      const playerId = `P${nextPlayerId}`;
      nextPlayerId += 1;
      room.state.players.push({ id: playerId, name, hand: [], alive: true, connected: true });
      room.clients.set(ws, playerId);
      ws.send(
        JSON.stringify({
          type: 'room_joined',
          code,
          playerId,
          isHost: room.hostId === playerId,
          state: room.state,
        })
      );
      broadcast(room);
      return;
    }

    if (data.type === 'action') {
      const roomCode = (data.roomCode || '').toUpperCase();
      const room = rooms.get(roomCode);
      if (!room) return;
      const playerId = room.clients.get(ws);
      if (!playerId) return;
      if (data.action?.type === 'start_game' && room.hostId !== playerId) return;
      if (data.action?.type === 'restart_game' && room.hostId !== playerId) return;
      room.state = applyAction(room.state, data.action);
      broadcast(room);
    }
  });

  ws.on('close', () => {
    rooms.forEach((room) => {
      const playerId = room.clients.get(ws);
      if (!playerId) return;
      room.clients.delete(ws);
      const player = room.state.players.find((p) => p.id === playerId);
      if (player) {
        player.connected = false;
      }
      broadcast(room);
    });
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
