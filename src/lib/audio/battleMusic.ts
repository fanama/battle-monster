/**
 * Musique de combat — deux thèmes (sauvage / boss), **synthétisés en Web Audio**
 * comme le reste des sons du jeu (aucun fichier à charger).
 *
 * Pourquoi synthétiser : le projet n'embarque aucun asset audio (`gameAudio.ts`
 * est 100 % procédural). Composer la boucle en données de notes garde cette
 * promesse — pas de binaire dans le dépôt, pas de licence, et le thème reste
 * lisible/ajustable dans le code.
 *
 * Architecture :
 *  - `TRACKS` : deux morceaux décrits en **données pures** (BPM + voix + drums).
 *  - `planForTrack` : transforme un morceau en **plan** (liste d'événements
 *    horodatés, durée de boucle). Pur, sans DOM → testable.
 *  - `startBattleMusic` / `stopBattleMusic` : séquenceur à *lookahead* branché
 *    sur le bus musique de `gameAudio`. Sans contexte audio (tests Bun, onglet
 *    jamais cliqué) ce sont des **no-op silencieux**.
 *
 * Fichier optionnel : si `public/audio/battle-wild.mp3` (ou `battle-boss.mp3`)
 * existe, il est joué **à la place** de la synthèse. Sinon la sonde échoue en
 * silence et la boucle synthétisée continue — voir `public/audio/README.md`.
 */

import {
  getGameAudioContext,
  getMusicBus,
  isGameAudioMuted,
  onGameAudioEnabledChange,
  onGameAudioReady,
} from "./gameAudio";

// --- Théorie : note nommée → fréquence -------------------------------------

const SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/**
 * Fréquence (Hz) d'une note nommée (`"A4"`, `"C#5"`).
 * Tempérament égal, A4 = 440 Hz. Renvoie 0 si la notation est invalide.
 */
export function noteFrequency(note: string): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!match) return 0;
  const semitone = SEMITONES[match[1]!];
  if (semitone === undefined) return 0;
  const octave = Number(match[2]);
  // MIDI : C-1 = 0, A4 = 69.
  const midi = 12 * (octave + 1) + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// --- Description des morceaux ----------------------------------------------

export type BattleTrackKind = "wild" | "boss";

/** Une voix mélodique : un pas = une double-croche (1/16 de mesure 4/4). */
export interface MusicVoice {
  wave: OscillatorType;
  /** Gain relatif au bus musique. */
  gain: number;
  /** Une entrée par pas ; `null` = silence. Un motif court est **répété** (boucle). */
  steps: Array<string | null>;
  /** Durée de la note, en fraction d'un pas (1 = tenue complète). Défaut : 0.9. */
  gate?: number;
}

/** Percussions, exprimées en indices de pas. */
export interface DrumPattern {
  kick: number[];
  snare: number[];
  hat: number[];
}

export interface BattleTrack {
  bpm: number;
  /** Nombre de pas de la boucle (16 = une mesure 4/4 en double-croches). */
  steps: number;
  voices: MusicVoice[];
  drums: DrumPattern;
}

/**
 * Thème des combats **sauvages** : A mineur, 138 BPM, progression Am–F–C–G,
 * pulsation à la croche — entraînant sans être épuisant (les combats sauvages
 * s'enchaînent).
 */
export const WILD_BATTLE_TRACK: BattleTrack = {
  bpm: 138,
  steps: 32,
  voices: [
    {
      // Basse : la fondamentale sur les temps, en croches.
      wave: "triangle",
      gain: 0.22,
      gate: 0.55,
      steps: [
        "A2", null, "A2", null, "A2", null, "A2", null,
        "F2", null, "F2", null, "F2", null, "F2", null,
        "C3", null, "C3", null, "C3", null, "C3", null,
        "G2", null, "G2", null, "G2", null, "G2", null,
      ],
    },
    {
      // Mélodie : arpège d'accords, une note par croche.
      wave: "square",
      gain: 0.14,
      gate: 0.7,
      steps: [
        "A4", null, "C5", null, "E5", null, "C5", null,
        "F4", null, "A4", null, "C5", null, "A4", null,
        "G4", null, "C5", null, "E5", null, "G5", null,
        "G4", null, "B4", null, "D5", null, "G4", null,
      ],
    },
    {
      // Ornement aigu (motif court, répété deux fois sur la boucle).
      wave: "square",
      gain: 0.09,
      gate: 0.35,
      steps: [
        "E5", "A5", "E5", "A5", "C5", "F5", "C5", "F5",
        "G5", "C6", "G5", "C6", "B4", "G5", "B4", "G5",
      ],
    },
  ],
  drums: {
    kick: [0, 3, 8, 11],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
};

/**
 * Thème des combats de **boss** : ré mineur, 152 BPM, pédale de basse et
 * triton (A#) pour la tension, doubles-croches aux percussions — plus dense et
 * plus sombre que le thème sauvage.
 */
export const BOSS_BATTLE_TRACK: BattleTrack = {
  bpm: 152,
  steps: 32,
  voices: [
    {
      wave: "sawtooth",
      gain: 0.2,
      gate: 0.5,
      steps: [
        "D2", null, "D2", "D2", "D2", null, "D2", "D2",
        "D2", null, "D2", "D2", "A#1", null, "A#1", "A#1",
        "F2", null, "F2", "F2", "F2", null, "F2", "F2",
        "G#2", null, "G#2", "G#2", "A2", null, "A2", "A2",
      ],
    },
    {
      wave: "square",
      gain: 0.15,
      gate: 0.65,
      steps: [
        "D5", null, "D5", "F5", null, "D5", null, "C5",
        "A#4", null, "A#4", "D5", null, "A#4", null, "G4",
        "F4", null, "F4", "A4", null, "C5", null, "A4",
        "G#4", null, "G#4", "D5", null, "C5", null, "A#4",
      ],
    },
    {
      wave: "triangle",
      gain: 0.08,
      gate: 0.3,
      steps: [
        "D4", "A4", "D5", "A4", "A#3", "F4", "A#4", "F4",
        "F4", "C5", "F5", "C5", "G#3", "D4", "G#4", "D4",
      ],
    },
  ],
  drums: {
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
};

export const TRACKS: Record<BattleTrackKind, BattleTrack> = {
  wild: WILD_BATTLE_TRACK,
  boss: BOSS_BATTLE_TRACK,
};

/**
 * Thème à jouer pour un combat donné : les boss ont le leur.
 * (Fonction pure — c'est le seul point de décision, donc le seul à tester.)
 */
export function resolveBattleTrack(isBoss: boolean): BattleTrackKind {
  return isBoss ? "boss" : "wild";
}

/**
 * Fichiers optionnels, servis depuis `public/` (racine du site). Absents par
 * défaut : la sonde échoue et la synthèse prend le relais.
 */
export const MUSIC_FILE_URLS: Record<BattleTrackKind, string> = {
  wild: "/audio/battle-wild.mp3",
  boss: "/audio/battle-boss.mp3",
};

// --- Planification (pure) ---------------------------------------------------

export interface ScheduledNote {
  /** Secondes depuis le début de la boucle. */
  time: number;
  freq: number;
  /** Durée du son, en secondes. */
  duration: number;
  wave: OscillatorType;
  gain: number;
}

export type DrumKind = "kick" | "snare" | "hat";

export interface ScheduledDrum {
  time: number;
  kind: DrumKind;
  gain: number;
}

export interface MusicPlan {
  /** Durée totale d'un tour de boucle, en secondes. */
  loopDuration: number;
  notes: ScheduledNote[];
  drums: ScheduledDrum[];
}

const DRUM_GAIN: Record<DrumKind, number> = {
  kick: 0.32,
  snare: 0.16,
  hat: 0.06,
};

/** Durée d'un pas (double-croche) pour un tempo donné. */
export function stepDuration(track: BattleTrack): number {
  return 60 / track.bpm / 4;
}

/**
 * Transforme un morceau en plan jouable : notes et percussions horodatées sur
 * une boucle. Un motif plus court que la boucle est répété (modulo), ce qui
 * permet d'écrire des voix de 16 pas dans une boucle de 32.
 */
export function planForTrack(track: BattleTrack): MusicPlan {
  const step = stepDuration(track);
  const notes: ScheduledNote[] = [];
  const drums: ScheduledDrum[] = [];

  for (const voice of track.voices) {
    if (voice.steps.length === 0) continue;
    const gate = voice.gate ?? 0.9;
    for (let i = 0; i < track.steps; i++) {
      const name = voice.steps[i % voice.steps.length];
      if (!name) continue;
      const freq = noteFrequency(name);
      if (freq <= 0) continue;
      notes.push({
        time: i * step,
        freq,
        duration: step * gate,
        wave: voice.wave,
        gain: voice.gain,
      });
    }
  }

  for (const kind of ["kick", "snare", "hat"] as const) {
    for (const index of track.drums[kind]) {
      if (index < 0 || index >= track.steps) continue;
      drums.push({ time: index * step, kind, gain: DRUM_GAIN[kind] });
    }
  }

  return { loopDuration: track.steps * step, notes, drums };
}

// --- Séquenceur (navigateur uniquement) -------------------------------------

/** Cadence du planificateur et horizon programmé, en secondes/millisecondes. */
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_S = 0.6;
/** Silence court avant la première note, le temps que le contexte soit stable. */
const START_DELAY_S = 0.08;

let desiredKind: BattleTrackKind | null = null;
let currentKind: BattleTrackKind | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
/** Gain de session : couper la sortie d'un coup sans traquer chaque oscillateur. */
let sessionGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let fileElement: HTMLAudioElement | null = null;
const fileStatus = new Map<BattleTrackKind, "ok" | "missing">();
let hooksInstalled = false;

function isBrowserAudioReady(): boolean {
  if (typeof window === "undefined" || isGameAudioMuted()) return false;
  return getGameAudioContext() != null && getMusicBus() != null;
}

function ensureHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // Le contexte peut ne pas exister au premier combat (aucun geste encore) :
  // on démarre dès qu'il est prêt.
  onGameAudioReady(() => {
    if (desiredKind && currentKind == null) beginPlayback(desiredKind);
  });
  // Muet → on coupe ; démuté en plein combat → on reprend le thème en cours.
  onGameAudioEnabledChange((on) => {
    if (!on) {
      teardown();
    } else if (desiredKind) {
      beginPlayback(desiredKind);
    }
  });
}

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const frames = Math.floor(context.sampleRate * 0.25);
  const buffer = context.createBuffer(1, Math.max(1, frames), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function scheduleNote(
  context: AudioContext,
  out: GainNode,
  note: ScheduledNote,
  at: number,
): void {
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = note.wave;
  osc.frequency.setValueAtTime(note.freq, at);
  const end = at + note.duration;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.gain), at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(env);
  env.connect(out);
  osc.start(at);
  osc.stop(end + 0.05);
}

function scheduleDrum(
  context: AudioContext,
  out: GainNode,
  drum: ScheduledDrum,
  at: number,
): void {
  if (drum.kind === "kick") {
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    env.gain.setValueAtTime(drum.gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    osc.connect(env);
    env.connect(out);
    osc.start(at);
    osc.stop(at + 0.18);
    return;
  }

  // Caisse claire / charley : bruit filtré, court.
  const src = context.createBufferSource();
  src.buffer = getNoiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = drum.kind === "snare" ? 1500 : 7000;
  const env = context.createGain();
  const duration = drum.kind === "snare" ? 0.11 : 0.04;
  env.gain.setValueAtTime(drum.gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(filter);
  filter.connect(env);
  env.connect(out);
  src.start(at);
  src.stop(at + duration + 0.02);
}

function scheduleLoop(plan: MusicPlan, at: number): void {
  const context = getGameAudioContext();
  if (!context || !sessionGain) return;
  for (const note of plan.notes) scheduleNote(context, sessionGain, note, at + note.time);
  for (const drum of plan.drums) scheduleDrum(context, sessionGain, drum, at + drum.time);
}

function stopScheduler(): void {
  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

/** Coupe la musique en cours (session + fichier) et remet l'état à zéro. */
function teardown(): void {
  stopScheduler();
  if (sessionGain) {
    try {
      sessionGain.disconnect();
    } catch {
      /* déjà déconnecté */
    }
    sessionGain = null;
  }
  if (fileElement) {
    try {
      fileElement.pause();
    } catch {
      /* élément déjà détruit */
    }
    fileElement = null;
  }
  currentKind = null;
}

/** Démarre la synthèse en boucle pour un thème. */
function startSynth(kind: BattleTrackKind): void {
  const context = getGameAudioContext();
  const bus = getMusicBus();
  if (!context || !bus) return;

  sessionGain = context.createGain();
  sessionGain.gain.value = 1;
  sessionGain.connect(bus);

  const plan = planForTrack(TRACKS[kind]);
  let nextLoopAt = context.currentTime + START_DELAY_S;

  const pump = () => {
    if (!sessionGain) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_S;
    // Garde-fou : après un long passage en arrière-plan, `currentTime` peut
    // avoir dépassé plusieurs boucles ; on recale au lieu d'empiler.
    if (nextLoopAt < context.currentTime) nextLoopAt = context.currentTime + 0.05;
    while (nextLoopAt < horizon) {
      scheduleLoop(plan, nextLoopAt);
      nextLoopAt += plan.loopDuration;
    }
  };

  pump();
  schedulerTimer = setInterval(pump, SCHEDULER_INTERVAL_MS);
}

/**
 * Si l'utilisateur a déposé un fichier pour ce thème, il remplace la synthèse.
 * La sonde est **asynchrone** : la synthèse démarre immédiatement (pas de
 * silence en début de combat) et le fichier prend le relais s'il arrive.
 */
function tryUserFile(kind: BattleTrackKind): void {
  if (typeof Audio === "undefined") return;
  if (fileStatus.get(kind)) return;

  let element: HTMLAudioElement;
  try {
    element = new Audio(MUSIC_FILE_URLS[kind]);
  } catch {
    fileStatus.set(kind, "missing");
    return;
  }
  element.loop = true;
  element.preload = "auto";
  element.volume = 0.35;

  element.addEventListener("error", () => {
    fileStatus.set(kind, "missing");
    element.src = "";
  });
  element.addEventListener("canplaythrough", () => {
    fileStatus.set(kind, "ok");
    // Le morceau a changé, ou la musique a été coupée entre-temps.
    if (currentKind !== kind || isGameAudioMuted()) return;
    stopScheduler();
    if (sessionGain) {
      try {
        sessionGain.disconnect();
      } catch {
        /* ignore */
      }
      sessionGain = null;
    }
    fileElement = element;
    element.currentTime = 0;
    void element.play().catch(() => {
      /* autoplay refusé : la synthèse n'est plus là, on retombe dessus */
      if (currentKind === kind) startSynth(kind);
    });
  });
}

function beginPlayback(kind: BattleTrackKind): void {
  if (!isBrowserAudioReady()) return;
  teardown();
  currentKind = kind;

  if (fileStatus.get(kind) === "ok" && typeof Audio !== "undefined") {
    const element = new Audio(MUSIC_FILE_URLS[kind]);
    element.loop = true;
    element.volume = 0.35;
    fileElement = element;
    void element.play().catch(() => {
      if (currentKind === kind) startSynth(kind);
    });
    return;
  }

  startSynth(kind);
  if (!fileStatus.has(kind)) tryUserFile(kind);
}

/**
 * Démarre le thème de combat correspondant (rejoue le même thème = no-op).
 * No-op silencieux hors navigateur / sans contexte audio.
 */
export function startBattleMusic(isBoss: boolean): void {
  ensureHooks();
  const kind = resolveBattleTrack(isBoss);
  desiredKind = kind;
  if (currentKind === kind) return;
  beginPlayback(kind);
}

/** Coupe la musique de combat (fin de combat, retour au menu, reset de run). */
export function stopBattleMusic(): void {
  desiredKind = null;
  teardown();
}

/** Pour les tests / l'UI : un thème est-il en train de jouer ? */
export function isBattleMusicPlaying(): boolean {
  return currentKind != null;
}
