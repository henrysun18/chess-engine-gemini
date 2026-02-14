
export const playBellSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    
    // Create oscillator and gain node
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Bell-like envelope
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t); // E5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.1); // Slight slide up to A5
    
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0); // Long decay

    osc.start(t);
    osc.stop(t + 2.0);
  } catch (e) {
    console.error("Audio playback failed (likely autoplay policy)", e);
  }
};

export const setAppTitle = (status: 'idle' | 'thinking' | 'done') => {
    const base = "Grandmaster Logic";
    if (status === 'thinking') {
        document.title = `Thinking... | ${base}`;
    } else if (status === 'done') {
        document.title = `🔴 Move Found! | ${base}`;
    } else {
        document.title = base;
    }
};
