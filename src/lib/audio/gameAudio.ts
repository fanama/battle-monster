/**
 * Sons du jeu, 100 % synthétisés (Web Audio) — aucun fichier à charger.
 *
 * Fonctionnement :
 *  - L'`AudioContext` n'est créé qu'au **premier geste utilisateur** (politique
 *    navigateur) : `initGameAudio()` pose les listeners une seule fois.
 *  - `play(...)` est silencieux et sans erreur si l'audio est indisponible
 *    (tests Bun sans DOM, onglet en fond, navigateur sans Web Audio).
 *  - Un bouton muet peut basculer `setEnabled` ; la préférence est gardée en
 *    localStorage sous `monster-battle:audio`.
 */

type SoundName =
  | "select" // clic sur un bouton / un onglet
  | "hit" // coup porté
  | "crit" // coup critique
  | "fumble" // raté / échec
  | "miss" // percé la CA sans dégâts
  | "heal" // soin
  | "buff" // amplification
  | "coin" // or / achat boutique
  | "levelup" // fanfare de montée de niveau
  | "victory" // victoire de combat
  | "defeat" // défaite / permadeath
  | "encounter"; // entrée en combat / apparition ennemie

const STORAGE_KEY = "monster-battle:audio";

let ctx: AudioContext | null = null;
let enabled = true;
let initialized = false;

/** Master gain chain: contexte → gain → destination. */
let masterGain: GainNode | null = null;

/**
 * Bus **musique** : sous-gain du master, pour que la musique de combat vive à
 * un niveau nettement plus bas que les bruitages (elle tourne en boucle, les
 * bruitages doivent rester lisibles par-dessus).
 */
let musicGain: GainNode | null = null;

/**
 * Niveau du bus musique, relatif au master. Volontairement sous le niveau des
 * bruitages (dont les pics montent à ~0,17 après master) : la boucle tourne en
 * continu, elle doit rester un fond sonore.
 */
const MUSIC_GAIN = 0.35;

/** Appelés dès que le contexte existe (le module musique s'y accroche). */
const readyCallbacks = new Set<() => void>();

/** Appelés à chaque bascule muet/son (la musique s'arrête/rep rend). */
const enabledCallbacks = new Set<(on: boolean) => void>();

export function isGameAudioEnabled(): boolean {
  return enabled && ctx != null;
}

/** L'utilisateur a-t-il coupé le son ? (état persisté, indépendant du contexte) */
export function isGameAudioMuted(): boolean {
  return !enabled;
}

/** Contexte partagé (module musique) — `null` tant que l'utilisateur n'a pas interagi. */
export function getGameAudioContext(): AudioContext | null {
  return ctx;
}

/** Bus musique (sous-gain du master) — `null` tant que le contexte n'existe pas. */
export function getMusicBus(): GainNode | null {
  return musicGain;
}

/**
 * S'abonne à la création du contexte. Le callback est appelé **tout de suite**
 * si le contexte existe déjà, sinon au premier geste utilisateur — c'est ce qui
 * permet à la musique de démarrer sans dépendre de l'ordre d'initialisation.
 */
export function onGameAudioReady(cb: () => void): void {
  readyCallbacks.add(cb);
  if (ctx) cb();
}

/**
 * S'abonne aux bascules muet/son. Renvoie la fonction de désabonnement (les
 * composants UI l'utilisent en `onDestroy`).
 */
export function onGameAudioEnabledChange(cb: (on: boolean) => void): () => void {
  enabledCallbacks.add(cb);
  return () => {
    enabledCallbacks.delete(cb);
  };
}

/** Bascule le son on/off (utile pour un bouton « 🔊 / 🔇 » dans l'UI). */
export function setGameAudioEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* pas grave : préférence non persistée */
  }
  if (on && ctx?.state === "suspended") void ctx.resume();
  // La musique de combat suit la préférence : coupée net au mute, reprise au
  // démutage si un combat est en cours (le module musique écoute).
  enabledCallbacks.forEach((cb) => {
    try {
      cb(on);
    } catch {
      /* un abonné ne doit jamais casser l'audio */
    }
  });
}

export function initGameAudio(): void {
  if (initialized) return;
  initialized = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null) enabled = stored !== "0";
  } catch {
    /* localStorage indisponible (mode privé) — on garde activé. */
  }
  if (typeof window === "undefined") return;
  // Le contexte se crée au premier geste (clic, touche) pour passer la
  // politique d'autoplay des navigateurs.
  const wake = () => {
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
    createCtx();
  };
  window.addEventListener("pointerdown", wake, { once: true, passive: true });
  window.addEventListener("keydown", wake, { once: true, passive: true });
}

function createCtx(): void {
  if (ctx) {
    // On pourrait avoir un contexte déjà amorphe après une mise en fond.
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = MUSIC_GAIN;
  musicGain.connect(masterGain);

  // Les abonnés (musique de combat) peuvent enfin démarrer.
  readyCallbacks.forEach((cb) => {
    try {
      cb();
    } catch {
      /* idem : jamais faire planter le jeu pour un son */
    }
  });
}

/** Note synthétique de base : oscillateur + enveloppe ADSR minimale. */
function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.18,
  slideTo?: number,
): void {
  if (!ctx || !masterGain || !enabled) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Bruit percussif (impact, flash) : bruit blanc filtré passe-bas. */
function thud(start: number, duration = 0.14, cutoff = 900, gain = 0.3): void {
  if (!ctx || !masterGain || !enabled) return;
  const t0 = ctx.currentTime + start;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, Math.max(1, frames), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(env);
  env.connect(masterGain);
  src.start(t0);
}

/** Séquence de notes ascendantes (fanfares). */
function jingle(
  notes: Array<[number, number, number?]>,
  type: OscillatorType = "square",
  gain = 0.16,
): void {
  for (const [freq, start, dur] of notes) {
    tone(freq, start, dur ?? 0.12, type, gain);
  }
}

/**
 * Joue un son nommé. Les timings décrivent des micro-séquençages façon
 * console rétro (8 bits) : courts, percussifs, lisibles parmi le combat.
 */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  try {
    if (!ctx) return; // Contexte pas encore réveillé : le premier clic l'ouvre.
    if (ctx.state === "suspended") void ctx.resume();

    switch (name) {
      case "select":
        tone(520, 0, 0.06, "square", 0.12);
        break;
      case "encounter":
        tone(196, 0, 0.16, "triangle", 0.2);
        tone(147, 0.12, 0.22, "triangle", 0.2);
        break;
      case "hit":
        thud(0, 0.12, 1400, 0.34);
        tone(180, 0, 0.08, "sawtooth", 0.16, 90);
        break;
      case "crit":
        thud(0, 0.2, 2200, 0.42);
        tone(340, 0, 0.07, "square", 0.24);
        tone(510, 0.07, 0.07, "square", 0.24);
        tone(760, 0.14, 0.16, "square", 0.24);
        break;
      case "fumble":
        tone(240, 0, 0.12, "sawtooth", 0.16, 120);
        break;
      case "miss":
        tone(600, 0, 0.05, "sine", 0.1, 380);
        break;
      case "heal":
        jingle([
          [523, 0],
          [659, 0.09],
          [784, 0.18],
          [1047, 0.28, 0.2],
        ], "sine", 0.14);
        break;
      case "buff":
        jingle([
          [392, 0],
          [523, 0.1],
          [659, 0.2],
        ], "triangle", 0.14);
        break;
      case "coin":
        jingle([
          [988, 0, 0.06],
          [1319, 0.06, 0.18],
        ], "square", 0.14);
        break;
      case "levelup":
        // Fanfare ascending 5 notes façon montée de niveau Pokémon.
        jingle([
          [523, 0, 0.1],
          [523, 0.1, 0.1],
          [523, 0.2, 0.1],
          [523, 0.34, 0.16],
          [415, 0.52, 0.14],
          [466, 0.68, 0.14],
          [622, 0.84, 0.34],
        ], "square", 0.18);
        break;
      case "victory":
        jingle([
          [523, 0, 0.12],
          [523, 0.14, 0.12],
          [523, 0.28, 0.12],
          [659, 0.42, 0.28],
          [784, 0.72, 0.34],
        ], "square", 0.18);
        break;
      case "defeat":
        jingle([
          [392, 0, 0.16],
          [330, 0.16, 0.16],
          [262, 0.32, 0.16],
          [196, 0.48, 0.4],
        ], "triangle", 0.18);
        break;
    }
  } catch {
    /* jamais faire planter le jeu pour un son */
  }
}
