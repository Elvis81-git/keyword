import { ZHUYIN_MAP, REVERSE_ZHUYIN_MAP, getRandomEnglish, getRandomZhuyin } from './zhuyin.js';
import * as sound from './sound.js';

class TypingGame {
  constructor() {
    // Game options
    this.mode = 'single'; // 'single' or 'multi'
    this.language = 'english'; // 'english' or 'zhuyin'
    this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
    
    // Core game state
    this.isPlaying = false;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.lives = 3;
    this.totalTyped = 0;
    this.correctTyped = 0;
    
    // Speeds and spawning
    this.baseSpeed = 1.0;          // Base falling rate
    this.speedMultiplier = 1.0;    // Multiplier (increases with time or multiplayer penalties)
    this.spawnInterval = 2000;     // Milliseconds between spawns
    this.spawnTimer = null;
    this.gameLoopId = null;
    
    // Letters array
    this.letters = [];
    this.nextLetterId = 0;
    
    // DOM elements (local player)
    this.boardEl = document.getElementById('local-board');
    this.lettersContainerEl = document.getElementById('local-letters');
    this.scoreEl = document.getElementById('local-score');
    this.streakEl = document.getElementById('local-streak');
    this.accuracyEl = document.getElementById('local-accuracy');
    this.livesEl = document.getElementById('local-lives');
    this.speedEl = document.getElementById('local-speed');
    
    // Timer properties
    this.timerEl = document.getElementById('arena-timer');
    this.timeRemaining = 60;
    this.timerInterval = null;
    
    // Callbacks for multiplayer coordination
    this.onStateUpdate = null; // function(state) called on changes
    this.onStreakTrigger = null; // function() called when streak of 5 is achieved
    this.onGameOver = null; // function(score, won)
    
    // Event listener reference for cleanup
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
  }

  init(config = {}) {
    this.mode = config.mode || 'single';
    this.language = config.language || 'english';
    this.difficulty = config.difficulty || 'medium';
    
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.lives = 3;
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.speedMultiplier = 1.0;
    this.letters = [];
    this.nextLetterId = 0;
    this.timeRemaining = 60;
    if (this.timerEl) {
      this.timerEl.textContent = '60s';
      this.timerEl.style.color = 'var(--secondary)';
      this.timerEl.style.borderColor = 'rgba(255,255,255,0.06)';
    }
    
    // Adjust configurations based on difficulty
    // easy: slow fall, slow spawn
    // medium: normal fall, normal spawn
    // hard: fast fall, fast spawn
    if (this.difficulty === 'easy') {
      this.baseSpeed = 0.8;
      this.spawnInterval = 2200;
    } else if (this.difficulty === 'medium') {
      this.baseSpeed = 1.2;
      this.spawnInterval = 1600;
    } else { // hard
      this.baseSpeed = 1.8;
      this.spawnInterval = 1100;
    }

    // Clean UI containers
    this.lettersContainerEl.innerHTML = '';
    this.updateUIStats();
    this.highlightKeyboardHelper(null);

    // Bind event listeners
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    window.addEventListener('keydown', this.boundKeyDownHandler);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // Start physics loop
    this.lastTime = performance.now();
    this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    
    // Start spawn timer
    this.spawnLetter(); // Spawn immediately
    this.startSpawnTimer();
    
    // Start countdown timer
    this.startTimer();
    
    this.notifyState();
  }

  stop() {
    this.isPlaying = false;
    cancelAnimationFrame(this.gameLoopId);
    clearInterval(this.spawnTimer);
    clearInterval(this.timerInterval);
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    this.highlightKeyboardHelper(null);
  }

  startSpawnTimer() {
    clearInterval(this.spawnTimer);
    this.spawnTimer = setInterval(() => {
      if (this.isPlaying) {
        this.spawnLetter();
      }
    }, this.spawnInterval);
  }

  spawnLetter() {
    // Determine the character to spawn
    let char = '';
    if (this.language === 'english') {
      char = getRandomEnglish();
    } else {
      char = getRandomZhuyin();
    }
    
    // Check if we already have too many letters on screen
    if (this.letters.length >= 15) return;
    
    // Randomized X position (leave margins so letters aren't cut off)
    const x = 10 + Math.random() * 80; 
    
    const letterId = this.nextLetterId++;
    
    // Create DOM element
    const el = document.createElement('div');
    el.className = 'letter-node';
    el.dataset.id = letterId;
    el.style.left = `${x}%`;
    el.style.top = `0%`;
    
    // Letter content
    const mainCharSpan = document.createElement('span');
    mainCharSpan.className = 'char-main';
    mainCharSpan.textContent = char;
    el.appendChild(mainCharSpan);
    
    // In Zhuyin mode, optionally add small keyboard indicator underneath to assist learning
    if (this.language === 'zhuyin') {
      const helperCharSpan = document.createElement('span');
      helperCharSpan.className = 'char-sub';
      const physKey = REVERSE_ZHUYIN_MAP[char] || '';
      helperCharSpan.textContent = physKey.toUpperCase();
      el.appendChild(helperCharSpan);
    }
    
    this.lettersContainerEl.appendChild(el);
    
    // Add to state tracking
    this.letters.push({
      id: letterId,
      char: char,
      x: x,
      y: 0,
      element: el
    });
    
    // Sort letters by depth to highlight the target (lowest one)
    this.updateTargetLetterHighlight();
  }

  gameLoop(time) {
    if (!this.isPlaying) return;
    
    const delta = (time - this.lastTime) / 16.666; // normalize to 60fps
    this.lastTime = time;
    
    this.updatePhysics(delta);
    
    this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  updatePhysics(delta) {
    let crossedLineCount = 0;
    const crossedLetters = [];
    
    // Fall speed takes difficulty baseSpeed * multiplier
    const speed = this.baseSpeed * this.speedMultiplier;
    
    this.letters.forEach(letter => {
      letter.y += speed * 0.22 * delta; // adjust falling scale
      letter.element.style.top = `${letter.y}%`;
      
      // Check if letter crossed the red danger line (at 90% height)
      if (letter.y >= 90 && !letter.crossed) {
        letter.crossed = true;
        crossedLetters.push(letter);
      }
    });
    
    // Process crossed letters (lose life)
    if (crossedLetters.length > 0) {
      crossedLetters.forEach(letter => {
        // Remove element from DOM
        if (letter.element && letter.element.parentNode) {
          letter.element.parentNode.removeChild(letter.element);
        }
        
        // Remove from list
        this.letters = this.letters.filter(l => l.id !== letter.id);
        
        // Decrement lives
        this.lives--;
        sound.playLifeLost();
        this.triggerScreenShake();
        
        // Streak resets on missing/crossing boundary
        this.streak = 0;
      });
      
      this.updateUIStats();
      this.updateTargetLetterHighlight();
      this.notifyState();
      
      if (this.lives <= 0) {
        this.gameOver(false); // Game Over (Loss)
        return;
      }
    }
  }

  updateTargetLetterHighlight() {
    if (this.letters.length === 0) {
      this.highlightKeyboardHelper(null);
      return;
    }
    
    // Find the lowest letter (highest Y value)
    let lowestLetter = this.letters[0];
    this.letters.forEach(l => {
      if (l.y > lowestLetter.y) {
        lowestLetter = l;
      }
    });
    
    // Mark target in UI
    this.letters.forEach(l => {
      if (l.id === lowestLetter.id) {
        l.element.classList.add('target-active');
      } else {
        l.element.classList.remove('target-active');
      }
    });
    
    // Update keyboard helper highlights
    if (this.language === 'english') {
      this.highlightKeyboardHelper(lowestLetter.char.toLowerCase());
    } else {
      const physicalKey = REVERSE_ZHUYIN_MAP[lowestLetter.char];
      this.highlightKeyboardHelper(physicalKey);
    }
  }

  handleKeyDown(event) {
    if (!this.isPlaying) return;
    
    // Ignore meta/control keys
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    let keyTyped = event.key;
    
    // Ignore long keys like Shift, CapsLock, Arrow keys
    if (keyTyped.length > 1 && keyTyped !== ';' && keyTyped !== ',' && keyTyped !== '.' && keyTyped !== '/' && keyTyped !== '-') {
      return;
    }
    
    this.totalTyped++;
    
    // Find the current target (lowest letter on screen)
    if (this.letters.length === 0) {
      // Typing when no letters exist: counts as miss
      this.registerMiss();
      return;
    }
    
    // Target is the lowest letter
    let targetLetter = this.letters[0];
    this.letters.forEach(l => {
      if (l.y > targetLetter.y) {
        targetLetter = l;
      }
    });
    
    let isCorrect = false;
    
    if (this.language === 'english') {
      isCorrect = (keyTyped.toLowerCase() === targetLetter.char.toLowerCase());
    } else {
      // Zhuyin Mode: map the typed key to Zhuyin, see if it matches target letter
      const mappedZhuyin = ZHUYIN_MAP[keyTyped.toLowerCase()];
      isCorrect = (mappedZhuyin === targetLetter.char);
    }
    
    // Trigger visual effect on physical key helper
    this.flashVirtualKey(keyTyped.toLowerCase());

    if (isCorrect) {
      this.correctTyped++;
      this.score += 10 + Math.floor(this.streak / 5) * 5; // bonus points for streaks
      this.streak++;
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }
      
      // Play sound
      sound.playCorrect();
      
      // Explosion particles
      this.createExplosion(targetLetter.x, targetLetter.y);
      
      // Remove element
      if (targetLetter.element && targetLetter.element.parentNode) {
        targetLetter.element.parentNode.removeChild(targetLetter.element);
      }
      
      // Remove from list
      this.letters = this.letters.filter(l => l.id !== targetLetter.id);
      
      // Streak milestone checks (Every 5 correct triggers speedup against opponent)
      if (this.streak > 0 && this.streak % 5 === 0) {
        sound.playStreak5();
        this.showStreakMilestoneEffect();
        if (this.onStreakTrigger) {
          this.onStreakTrigger();
        }
      }
      
      this.updateUIStats();
      this.updateTargetLetterHighlight();
      this.notifyState();
    } else {
      // Incorrect typed
      this.registerMiss();
    }
  }

  registerMiss() {
    this.score = Math.max(0, this.score - 5);
    this.streak = 0;
    
    sound.playIncorrect();
    this.triggerScreenShake();
    this.updateUIStats();
    this.notifyState();
  }

  applyOpponentSpeedMultiplier(penaltyFactor) {
    // Increase falling speed multiplier
    this.speedMultiplier = parseFloat((this.speedMultiplier + penaltyFactor).toFixed(2));
    
    // Cap at a max multiplier of 3.0 to prevent impossible speeds
    if (this.speedMultiplier > 3.0) {
      this.speedMultiplier = 3.0;
    }
    
    sound.playSpeedPenalty();
    this.triggerSpeedAlert();
    this.updateUIStats();
    this.notifyState();
  }

  resetSpeed() {
    this.speedMultiplier = 1.0;
    this.updateUIStats();
    this.notifyState();
  }

  updateUIStats() {
    this.scoreEl.textContent = this.score;
    this.streakEl.textContent = this.streak;
    
    const accuracy = this.totalTyped > 0 ? Math.round((this.correctTyped / this.totalTyped) * 100) : 100;
    this.accuracyEl.textContent = `${accuracy}%`;
    
    // Speed multiplier display
    this.speedEl.textContent = `${this.speedMultiplier.toFixed(1)}x`;
    
    // Lives display
    this.livesEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('div');
      heart.className = i < this.lives ? 'heart active' : 'heart empty';
      this.livesEl.appendChild(heart);
    }
  }

  highlightKeyboardHelper(key) {
    // Remove previous target highlights
    const keys = document.querySelectorAll('.vkey');
    keys.forEach(k => k.classList.remove('vkey-target'));
    
    if (!key) return;
    
    // Add highlight class to target key
    const targetKeyEl = document.querySelector(`.vkey[data-key="${key}"]`);
    if (targetKeyEl) {
      targetKeyEl.classList.add('vkey-target');
    }
  }

  flashVirtualKey(key) {
    const keyEl = document.querySelector(`.vkey[data-key="${key}"]`);
    if (keyEl) {
      keyEl.classList.add('vkey-pressed');
      setTimeout(() => {
        keyEl.classList.remove('vkey-pressed');
      }, 100);
    }
  }

  triggerScreenShake() {
    this.boardEl.classList.remove('shake');
    // Trigger reflow to restart animation
    void this.boardEl.offsetWidth;
    this.boardEl.classList.add('shake');
  }

  triggerSpeedAlert() {
    const alertEl = document.getElementById('speed-alert');
    if (alertEl) {
      alertEl.classList.remove('alert-active');
      void alertEl.offsetWidth;
      alertEl.classList.add('alert-active');
      setTimeout(() => {
        alertEl.classList.remove('alert-active');
      }, 1200);
    }
  }

  showStreakMilestoneEffect() {
    const streakPopup = document.createElement('div');
    streakPopup.className = 'streak-popup';
    streakPopup.textContent = `COMBO X${this.streak}!`;
    this.boardEl.appendChild(streakPopup);
    setTimeout(() => {
      if (streakPopup.parentNode) {
        streakPopup.parentNode.removeChild(streakPopup);
      }
    }, 1000);
  }

  createExplosion(x, y) {
    const particleCount = 10;
    const colors = ['#a020f0', '#00ffff', '#ff00ff', '#ffffff'];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Random directions
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 5;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;
      
      this.boardEl.appendChild(particle);
      
      let pX = x;
      let pY = y;
      let opacity = 1.0;
      
      const updateParticle = () => {
        pX += dx * 0.15;
        pY += dy * 0.15;
        opacity -= 0.04;
        
        particle.style.left = `${pX}%`;
        particle.style.top = `${pY}%`;
        particle.style.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(updateParticle);
        } else {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }
      };
      
      requestAnimationFrame(updateParticle);
    }
  }

  notifyState() {
    if (this.onStateUpdate) {
      // Map active letters to lightweight object array for sending
      const letterData = this.letters.map(l => ({
        id: l.id,
        char: l.char,
        x: l.x,
        y: l.y
      }));
      
      const accuracy = this.totalTyped > 0 ? Math.round((this.correctTyped / this.totalTyped) * 100) : 100;
      
      this.onStateUpdate({
        score: this.score,
        streak: this.streak,
        lives: this.lives,
        accuracy: accuracy,
        speedMultiplier: this.speedMultiplier,
        letters: letterData,
        timeRemaining: this.timeRemaining
      });
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.isPlaying) {
        this.timeRemaining--;
        this.updateTimerUI();
        
        // Single player speed acceleration over time
        if (this.mode === 'single') {
          const timeElapsed = 60 - this.timeRemaining;
          // Every 10 seconds, increase speed by +0.1
          if (timeElapsed > 0 && timeElapsed % 10 === 0 && this.timeRemaining > 0) {
            this.speedMultiplier = parseFloat((this.speedMultiplier + 0.1).toFixed(2));
            sound.playSpeedPenalty();
            this.triggerSpeedAlert();
            this.updateUIStats();
          }
        }
        
        if (this.timeRemaining <= 0) {
          clearInterval(this.timerInterval);
          this.gameOver(true); // Survived!
        }
      }
    }, 1000);
  }

  updateTimerUI() {
    if (this.timerEl) {
      this.timerEl.textContent = `${this.timeRemaining}s`;
      if (this.timeRemaining <= 10) {
        this.timerEl.style.color = 'var(--danger)';
        this.timerEl.style.borderColor = 'var(--danger)';
      } else {
        this.timerEl.style.color = 'var(--secondary)';
        this.timerEl.style.borderColor = 'rgba(255,255,255,0.06)';
      }
    }
  }

  gameOver(won = false) {
    this.stop();
    sound.playGameOver(won);
    
    if (this.onGameOver) {
      const accuracy = this.totalTyped > 0 ? Math.round((this.correctTyped / this.totalTyped) * 100) : 100;
      this.onGameOver({
        score: this.score,
        maxStreak: this.maxStreak,
        accuracy: accuracy,
        won: won,
        timeOut: this.timeRemaining <= 0
      });
    }
  }
}

export default TypingGame;
