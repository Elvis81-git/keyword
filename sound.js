// Web Audio API Synthesizer for Retro Game Sound Effects
let audioCtx = null;
let isMuted = false;

/**
 * Initializes or resumes the AudioContext safely after user gesture.
 */
function getAudioContext() {
  if (isMuted) return null;
  
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("Web Audio API is not supported or blocked: ", e);
    return null;
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  if (isMuted && audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
  return isMuted;
}

export function getMuteState() {
  return isMuted;
}

/**
 * Synthesizes a clean correct-typing tone (quick chime)
 */
export function playCorrect() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5

  gainNode.gain.setValueAtTime(0.15, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Synthesizes an incorrect-typing buzzer
 */
export function playIncorrect() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(130.81, now); // C3
  osc.frequency.linearRampToValueAtTime(80, now + 0.15);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.linearRampToValueAtTime(0.001, now + 0.18);

  // Bandpass filter to make it sound more like a vintage game buzzer
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 250;

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Plays an upbeat rising arpeggio when a player hits a 5-streak combo
 */
export function playStreak5() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
  const duration = 0.05;

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.045;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);

    gainNode.gain.setValueAtTime(0.12, noteTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + duration);
  });
}

/**
 * Plays a double alarm pulse when a player receives a speed penalty from the opponent
 */
export function playSpeedPenalty() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Two pulses of alarm
  [0, 0.18, 0.36].forEach((delay) => {
    const pulseTime = now + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(659.25, pulseTime); // E5
    osc.frequency.linearRampToValueAtTime(440.00, pulseTime + 0.12); // A4

    gainNode.gain.setValueAtTime(0.15, pulseTime);
    gainNode.gain.linearRampToValueAtTime(0.001, pulseTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(pulseTime);
    osc.stop(pulseTime + 0.15);
  });
}

/**
 * Synthesizes a sad descending cadence when a player loses a life
 */
export function playLifeLost() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [329.63, 293.66, 261.63]; // E4, D4, C4
  
  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.12;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteTime);

    gainNode.gain.setValueAtTime(0.15, noteTime);
    gainNode.gain.linearRampToValueAtTime(0.001, noteTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.12);
  });
}

/**
 * Plays the end-of-game song
 * @param {boolean} isVictory - Whether the player won or lost
 */
export function playGameOver(isVictory) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (isVictory) {
    // Upbeat celebratory victory music
    const chord = [261.63, 329.63, 392.00, 523.25]; // C major chord
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.6);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    });
  } else {
    // Melodramatic minor chord fall for defeat
    const chord = [220.00, 261.63, 329.63]; // A minor chord (A3, C4, E4)
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.75, now + 1.0); // pitch bend down

      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 1.2);

      // Low pass filter to make it sound warm and tragic
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.25);
    });
  }
}
