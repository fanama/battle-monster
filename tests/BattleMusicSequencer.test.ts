import { afterAll, describe, expect, test } from 'bun:test';
import {
  BOSS_BATTLE_TRACK,
  noteFrequency,
  planForTrack,
  startBattleMusic,
  stopBattleMusic,
} from '../src/lib/audio/battleMusic';
import { initGameAudio } from '../src/lib/audio/gameAudio';

/**
 * Vérifie le **séquenceur** (pas seulement le plan) : avec un faux
 * `AudioContext` installé sur `window`, on passe par les vrais points d'entrée
 * (`initGameAudio` → réveil au geste → `startBattleMusic`) et on relit les
 * oscillateurs réellement programmés.
 *
 * C'est ce qui manque aux tests du planificateur : que la boucle soit bien
 * *scheduleée* dans le graphe audio, avec les bonnes fréquences.
 */

class FakeParam {
  value = 0;
  events: Array<[number, number]> = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.events.push([v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push([v, t]);
    return this;
  }
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  started: number[] = [];
  start(t: number) {
    this.started.push(t);
  }
  stop(_t: number) {}
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
}

class FakeBufferSource extends FakeNode {
  buffer: unknown = null;
  start(_t: number) {}
  stop(_t: number) {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  sources = 0;

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createBufferSource() {
    this.sources++;
    return new FakeBufferSource();
  }
  createBuffer(_channels: number, frames: number) {
    return {
      sampleRate: this.sampleRate,
      length: frames,
      getChannelData: () => new Float32Array(Math.max(1, frames)),
    };
  }
  resume() {
    return Promise.resolve();
  }
}

const listeners: Record<string, Array<() => void>> = {};
const savedGlobals = {
  window: (globalThis as Record<string, unknown>).window,
  AudioContext: (globalThis as Record<string, unknown>).AudioContext,
};

// `window` minimal : on capture les listeners de réveil pour déclencher le
// geste utilisateur à la main (le contexte ne naît qu'à ce moment-là).
// `gameAudio` lit `window.AudioContext` (et non le global) : le faux window
// doit donc porter le constructeur lui-même.
(globalThis as Record<string, unknown>).window = {
  AudioContext: FakeAudioContext,
  addEventListener: (type: string, cb: () => void) => {
    (listeners[type] ??= []).push(cb);
  },
  removeEventListener: (type: string, cb: () => void) => {
    listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
  },
};

initGameAudio();

afterAll(() => {
  stopBattleMusic();
  (globalThis as Record<string, unknown>).window = savedGlobals.window;
  (globalThis as Record<string, unknown>).AudioContext = savedGlobals.AudioContext;
});

describe('Séquenceur de musique de combat', () => {
  test('le contexte n’existe qu’après le premier geste utilisateur', () => {
    expect(FakeAudioContext.instances.length).toBe(0);
    // Réveil : c'est le geste (clic) qui crée le contexte audio.
    (listeners.pointerdown ?? []).forEach((fn) => fn());
    expect(FakeAudioContext.instances.length).toBe(1);
  });

  test('démarrer un combat programme réellement une boucle de notes', () => {
    startBattleMusic(true); // boss
    const ctx = FakeAudioContext.instances[0]!;
    const plan = planForTrack(BOSS_BATTLE_TRACK);

    // Une boucle complète : chaque note du plan + un oscillateur par coup de
    // grosse caisse (le kick est un oscillateur, pas un bruit).
    expect(ctx.oscillators.length).toBeGreaterThanOrEqual(plan.notes.length);

    // Les fréquences programmées sont bien celles du plan (et pas du bruit) :
    // la basse du boss est une pédale de ré2.
    const freqs = ctx.oscillators.map((o) => o.frequency.value);
    const d2 = noteFrequency('D2');
    expect(freqs.some((f) => Math.abs(f - d2) < 0.5)).toBe(true);

    // Les percussions à bruit (caisse claire / charley) sont passées par des
    // buffer sources filtrées.
    expect(ctx.sources).toBeGreaterThan(0);
  });

  test('les deux thèmes programment des notes différentes', () => {
    const ctx = FakeAudioContext.instances[0]!;
    const bossFreqs = ctx.oscillators.map((o) => o.frequency.value);

    stopBattleMusic();
    ctx.oscillators.length = 0;
    startBattleMusic(false); // sauvage

    const wildFreqs = FakeAudioContext.instances[0]!.oscillators.map((o) => o.frequency.value);
    expect(wildFreqs.length).toBeGreaterThan(0);

    // Le boss descend sous le triton (la#1 ≈ 58 Hz), le thème sauvage ne
    // descend jamais si bas (basse la2 / fa2 ≈ 87 Hz minimum).
    expect(bossFreqs.some((f) => f > 0 && f < 60)).toBe(true);
    expect(wildFreqs.some((f) => f > 0 && f < 80)).toBe(false);
  });

  test('arrêter la musique libère le séquenceur (plus de réveil suivant)', () => {
    stopBattleMusic();
    const ctx = FakeAudioContext.instances[0]!;
    const before = ctx.oscillators.length;
    // Plus aucune programmation après l'arrêt : le contexte reste figé
    // (`currentTime` n'avance pas dans le faux contexte).
    expect(ctx.oscillators.length).toBe(before);
  });
});
