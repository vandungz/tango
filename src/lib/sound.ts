import { getSoundVolume } from './storage';

// Web Audio API sound effects — no external audio files needed

let audioCtx: AudioContext | null = null;
let masterVolume = getSoundVolume();

function clampVolume(volume: number): number {
    return Math.min(1, Math.max(0, volume));
}

function getContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

export function setMasterVolume(volume: number): void {
    masterVolume = clampVolume(volume);
}

export function getMasterVolume(): number {
    return masterVolume;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) {
    const effectiveVolume = clampVolume(masterVolume) * volume;
    if (effectiveVolume <= 0) return;

    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

export function playClickSound() {
    playTone(600, 0.08, 'sine', 0.1);
}

export function playClearSound() {
    playTone(300, 0.1, 'sine', 0.08);
}

export function playHintSound() {
    const ctx = getContext();
    const now = ctx.currentTime;
    playTone(523, 0.15, 'sine', 0.12); // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 150); // E5
}

export function playErrorSound() {
    playTone(200, 0.2, 'square', 0.08);
    setTimeout(() => playTone(180, 0.3, 'square', 0.08), 100);
}

export function playVictorySound() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sine', 0.12), i * 150);
    });
}
