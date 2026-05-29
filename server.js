const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static frontend files from the root directory
app.use(express.static(__dirname));

// Direct fallback to index.html for any other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);

// Initialize Socket.io with loose CORS for GitHub Pages connectivity
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Matchmaking Room database
// rooms[roomCode] = { id, players: { socketId: { username, score, lives, streak, isHost, isReady } }, language, difficulty, status }
const rooms = {};

// Helper to generate a unique 5-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]); // Ensure uniqueness
  return code;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Join Matchmaking (automatic pairing)
  socket.on('joinMatchmaking', ({ username, language, difficulty }) => {
    // Find a room with status 'waiting' that has exactly 1 player
    let matchedRoom = null;
    for (const code in rooms) {
      const room = rooms[code];
      if (room.status === 'waiting' && Object.keys(room.players).length === 1) {
        matchedRoom = room;
        break;
      }
    }

    if (matchedRoom) {
      // Join the matched room
      matchedRoom.players[socket.id] = {
        id: socket.id,
        username: username || 'Player 2',
        score: 0,
        lives: 3,
        streak: 0,
        isHost: false,
        isReady: true
      };
      
      socket.join(matchedRoom.roomCode);
      console.log(`Matched user ${username} (${socket.id}) into room ${matchedRoom.roomCode}`);
      
      // Auto-start the game
      matchedRoom.status = 'playing';
      io.to(matchedRoom.roomCode).emit('gameStart', {
        language: matchedRoom.language, // Keep settings from host
        difficulty: matchedRoom.difficulty
      });
    } else {
      // Create a new room and wait
      const roomCode = generateRoomCode();
      rooms[roomCode] = {
        roomCode,
        hostId: socket.id,
        language: language || 'english',
        difficulty: difficulty || 'medium',
        status: 'waiting',
        players: {
          [socket.id]: {
            id: socket.id,
            username: username || 'Player 1',
            score: 0,
            lives: 3,
            streak: 0,
            isHost: true,
            isReady: true
          }
        }
      };
      
      socket.join(roomCode);
      console.log(`No match found. User ${username} (${socket.id}) created waiting room ${roomCode}`);
      socket.emit('matchmakingWaiting', { roomCode, username });
    }
  });

  // 4. Real-time board state synchronization
  socket.on('syncState', ({ roomCode, state }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    // Save state details on server
    const player = room.players[socket.id];
    if (player) {
      player.score = state.score;
      player.lives = state.lives;
      player.streak = state.streak;
    }

    // Relay state to the other player in the room
    socket.to(roomCode).emit('opponentSyncState', state);
  });

  // 5. Streak triggered accelerator penalty
  socket.on('triggerStreakSpeed', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    // Send acceleration modifier to opponent
    // We add a +0.15 multiplier to opponent's falling speed
    socket.to(roomCode).emit('applySpeedPenalty', { penaltyFactor: 0.15 });
    
    console.log(`Streak speed penalty emitted in room ${roomCode} by ${socket.id}`);
  });

  // 6. Game over logic (A player lost all lives or timed out)
  socket.on('playerGameOver', ({ roomCode, results }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (player) {
      player.gameOverResults = results;
    }

    const playerIds = Object.keys(room.players);
    const opponentId = playerIds.find(id => id !== socket.id);
    const opponent = room.players[opponentId];

    // Case 1: The sender died (did not survive / lives ran out)
    if (!results.timeOut) {
      room.status = 'ended';
      console.log(`Game over in room ${roomCode}. Sender (${socket.id}) died. Opponent (${opponentId}) wins.`);
      
      const opponentName = opponent ? opponent.username : 'Opponent';
      const playerName = player ? player.username : 'Player';
      
      io.to(roomCode).emit('gameResult', {
        winnerId: opponentId,
        loserId: socket.id,
        reason: `${opponentName} outlived ${playerName}!`
      });
      return;
    }

    // Case 2: The sender survived (timeOut === true)
    console.log(`Player ${player ? player.username : socket.id} survived 60s. Score: ${results.score}`);
    
    // Check if the opponent has also finished (either died earlier or also survived)
    if (opponent && (opponent.gameOverResults || opponent.lives <= 0)) {
      room.status = 'ended';
      
      const p1Results = results;
      const p2Results = opponent.gameOverResults || { score: opponent.score, timeOut: false };
      
      let winnerId = null;
      let loserId = null;
      let reason = '';
      
      if (p2Results.timeOut) {
        // Both survived! Compare scores
        if (p1Results.score > p2Results.score) {
          winnerId = socket.id;
          loserId = opponentId;
          reason = `Both survived! ${player.username} won on points: ${p1Results.score} vs ${p2Results.score}!`;
        } else if (p2Results.score > p1Results.score) {
          winnerId = opponentId;
          loserId = socket.id;
          reason = `Both survived! ${opponent.username} won on points: ${p2Results.score} vs ${p1Results.score}!`;
        } else {
          winnerId = socket.id; // Tie-breaker host/first
          loserId = opponentId;
          reason = `Draw match! Perfect tie at ${p1Results.score} points!`;
        }
      } else {
        // Opponent died earlier, player survived. Player wins!
        winnerId = socket.id;
        loserId = opponentId;
        reason = `${player.username} survived the full 60s while ${opponent.username} did not!`;
      }
      
      io.to(roomCode).emit('gameResult', {
        winnerId,
        loserId,
        reason
      });
    } else {
      // Opponent is still playing, wait for them to finish
      console.log(`Waiting for opponent to finish...`);
    }
  });

  // 7. Handle Disconnect
  socket.on('disconnecting', () => {
    // Find rooms the player was in
    const activeRooms = Array.from(socket.rooms).filter(r => r !== socket.id);

    activeRooms.forEach(roomCode => {
      const room = rooms[roomCode];
      if (!room) return;

      console.log(`User ${socket.id} disconnecting from room ${roomCode}`);

      // Delete player
      delete room.players[socket.id];

      // If room empty, delete room
      const remainingPlayers = Object.keys(room.players);
      if (remainingPlayers.length === 0) {
        delete rooms[roomCode];
        console.log(`Room ${roomCode} deleted (empty).`);
      } else {
        // If room is active, notify remaining opponent
        if (room.status === 'playing') {
          room.status = 'ended';
          socket.to(roomCode).emit('opponentDisconnected');
        } else {
          // If still in lobby, update host if needed and refresh lobby roster
          if (room.hostId === socket.id) {
            room.hostId = remainingPlayers[0];
            room.players[remainingPlayers[0]].isHost = true;
          }
          io.to(roomCode).emit('roomUpdated', room);
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Keyword backend running on port ${PORT}`);
  console.log(`Local dev address: http://localhost:${PORT}`);
});
