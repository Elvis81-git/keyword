function generateClientRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class MultiplayerClient {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.socket = null;
    this.roomCode = null;
    this.isHost = false;
    this.username = '';
    this.opponentName = 'Opponent';
    this.opponentId = null;
    
    // Opponent DOM elements
    this.oppBoardEl = document.getElementById('opponent-board');
    this.oppLettersEl = document.getElementById('opponent-letters');
    this.oppScoreEl = document.getElementById('opponent-score');
    this.oppStreakEl = document.getElementById('opponent-streak');
    this.oppAccuracyEl = document.getElementById('opponent-accuracy');
    this.oppLivesEl = document.getElementById('opponent-lives');
    this.oppSpeedEl = document.getElementById('opponent-speed');
    this.oppNameBadgeEl = document.getElementById('opponent-name-badge');
    
    // Lobby UI bindings
    this.statusBadgeEl = document.getElementById('connection-status');
    this.customServerInputEl = document.getElementById('server-url-input');
    
    // Bind game callbacks to sync over socket
    this.game.onStateUpdate = (state) => {
      if (this.socket && this.roomCode) {
        this.socket.emit('syncState', { roomCode: this.roomCode, state });
      }
    };
    
    this.game.onStreakTrigger = () => {
      if (this.socket && this.roomCode) {
        this.socket.emit('triggerStreakSpeed', { roomCode: this.roomCode });
      }
    };
    
    this.game.onGameOver = (results) => {
      if (this.socket && this.roomCode) {
        this.socket.emit('playerGameOver', { roomCode: this.roomCode, results });
      }
    };
  }

  getServerUrl() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // 1. Get from input if customized
    let url = this.customServerInputEl ? this.customServerInputEl.value.trim() : '';
    
    // 2. If running on localhost and input is empty, ALWAYS return local origin
    if (!url && isLocalhost) {
      if (this.customServerInputEl) {
        this.customServerInputEl.placeholder = window.location.origin;
      }
      return window.location.origin;
    }
    
    // 3. Get from localStorage
    if (!url) {
      url = localStorage.getItem('keyword_server_url') || '';
    }
    
    // 4. Fallback default Render URL
    if (!url) {
      url = 'https://keyword-typer-backend.onrender.com';
    }
    
    // Save to local storage for convenience if not on localhost
    if (!isLocalhost) {
      localStorage.setItem('keyword_server_url', url);
    }
    
    if (this.customServerInputEl && !this.customServerInputEl.value) {
      this.customServerInputEl.value = url;
    }
    
    return url;
  }

  connect(callback) {
    const url = this.getServerUrl();
    this.updateStatusBadge('connecting', 'Connecting...');
    
    // Disconnect previous socket if any
    if (this.socket) {
      this.socket.disconnect();
    }
    
    try {
      // Connect with WebSockets force if possible
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      this.socket.on('connect', () => {
        this.updateStatusBadge('online', 'Server Online');
        if (callback) callback(true);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.updateStatusBadge('offline', 'Server Offline');
        if (callback) callback(false);
      });
      
      this.socket.on('disconnect', () => {
        this.updateStatusBadge('offline', 'Disconnected');
      });
      
      // Bind incoming events from server
      this.setupSocketListeners();
      
    } catch (e) {
      console.error('Socket.io failed to initialize:', e);
      this.updateStatusBadge('offline', 'Library Error');
      if (callback) callback(false);
    }
  }

  updateStatusBadge(status, text) {
    if (!this.statusBadgeEl) return;
    this.statusBadgeEl.className = `status-badge ${status}`;
    this.statusBadgeEl.textContent = text;
  }

  setupSocketListeners() {
    // Matchmaking status waiting
    this.socket.on('matchmakingWaiting', (data) => {
      this.roomCode = data.roomCode;
      this.isHost = true;
      document.getElementById('lobby-status-title').textContent = '正在尋找對手...';
    });

    // Game starts
    this.socket.on('gameStart', (data) => {
      // Retrieve game settings
      const config = {
        mode: 'multi',
        language: data.language,
        difficulty: data.difficulty
      };
      
      // Initialize opponent UI state
      this.oppNameBadgeEl.textContent = this.opponentName;
      this.oppScoreEl.textContent = '0';
      this.oppStreakEl.textContent = '0';
      this.oppAccuracyEl.textContent = '100%';
      this.oppSpeedEl.textContent = '1.0x';
      this.oppLettersEl.innerHTML = '';
      this.oppLivesEl.innerHTML = '❤️ ❤️ ❤️';
      
      // Switch screens
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('game-arena-screen').classList.remove('hidden');
      document.getElementById('arena-multiplayer-split').classList.add('active');
      
      // Initialize local game instance
      this.game.init(config);
      
      // Count down 3s before starting physics
      let countdown = 3;
      const overlay = document.getElementById('arena-countdown-overlay');
      overlay.classList.remove('hidden');
      overlay.textContent = countdown;
      
      const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          overlay.textContent = countdown;
        } else if (countdown === 0) {
          overlay.textContent = 'START!';
        } else {
          clearInterval(timer);
          overlay.classList.add('hidden');
          this.game.start();
        }
      }, 1000);
    });

    // Sync opponent board states
    this.socket.on('opponentSyncState', (state) => {
      this.updateOpponentUI(state);
    });

    // Speed penalty applied by opponent streak
    this.socket.on('applySpeedPenalty', (data) => {
      this.game.applyOpponentSpeedMultiplier(data.penaltyFactor);
    });

    // Opponent disconnected
    this.socket.on('opponentDisconnected', () => {
      this.game.stop();
      this.showMultiplayerResult({
        won: true,
        reason: 'Opponent disconnected from the match.'
      });
    });

    // Game ends
    this.socket.on('gameResult', (data) => {
      this.game.stop();
      const isWinner = data.winnerId === this.socket.id;
      
      let defaultReason = isWinner ? 'You outlived your opponent!' : 'Your opponent outlived you.';
      if (data.reason) {
        defaultReason = data.reason;
      }
      
      this.showMultiplayerResult({
        won: isWinner,
        score: this.game.score,
        accuracy: this.game.totalTyped > 0 ? Math.round((this.game.correctTyped / this.game.totalTyped) * 100) : 100,
        maxStreak: this.game.maxStreak,
        reason: defaultReason
      });
    });

    this.socket.on('serverError', (data) => {
      alert(`Server Error: ${data.message}`);
    });
  }

  joinMatchmaking(username, language, difficulty) {
    if (!this.socket || !this.socket.connected) {
      alert('Please connect to the server first.');
      return;
    }
    this.username = username || 'Player';
    this.socket.emit('joinMatchmaking', {
      username: this.username,
      language,
      difficulty
    });
  }

  updateOpponentUI(state) {
    if (!state) return;
    
    // Stats
    this.oppScoreEl.textContent = state.score;
    this.oppStreakEl.textContent = state.streak;
    this.oppAccuracyEl.textContent = `${state.accuracy}%`;
    this.oppSpeedEl.textContent = `${state.speedMultiplier.toFixed(1)}x`;
    
    // Lives (Heart drawing)
    this.oppLivesEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('div');
      heart.className = i < state.lives ? 'heart active' : 'heart empty';
      this.oppLivesEl.appendChild(heart);
    }
    
    // Letters rendering
    this.oppLettersEl.innerHTML = '';
    state.letters.forEach(l => {
      const el = document.createElement('div');
      el.className = 'letter-node opponent-node';
      el.style.left = `${l.x}%`;
      el.style.top = `${l.y}%`;
      
      const span = document.createElement('span');
      span.className = 'char-main';
      span.textContent = l.char;
      el.appendChild(span);
      
      this.oppLettersEl.appendChild(el);
    });
  }

  showMultiplayerResult(data) {
    document.getElementById('game-arena-screen').classList.add('hidden');
    
    const screen = document.getElementById('gameover-screen');
    screen.classList.remove('hidden');
    
    const title = document.getElementById('gameover-title');
    const subtitle = document.getElementById('gameover-subtitle');
    
    if (data.won) {
      title.textContent = 'VICTORY!';
      title.className = 'victory-text';
      subtitle.textContent = data.reason || 'You won!';
    } else {
      title.textContent = 'DEFEAT!';
      title.className = 'defeat-text';
      subtitle.textContent = data.reason || 'You lost!';
    }
    
    // Stats
    document.getElementById('gameover-score').textContent = data.score !== undefined ? data.score : this.game.score;
    document.getElementById('gameover-streak').textContent = data.maxStreak !== undefined ? data.maxStreak : this.game.maxStreak;
    document.getElementById('gameover-accuracy').textContent = data.accuracy !== undefined ? `${data.accuracy}%` : `${this.game.accuracy}%`;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomCode = null;
  }
}

export default MultiplayerClient;
