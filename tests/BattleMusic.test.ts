import { describe, expect, test } from 'bun:test';
import {
  BOSS_BATTLE_TRACK,
  MUSIC_FILE_URLS,
  TRACKS,
  WILD_BATTLE_TRACK,
  isBattleMusicPlaying,
  noteFrequency,
  planForTrack,
  resolveBattleTrack,
  startBattleMusic,
  stepDuration,
  stopBattleMusic,
  type BattleTrack,
} from '../src/lib/audio/battleMusic';
import {
  isGameAudioMuted,
  setGameAudioEnabled,
} from '../src/lib/audio/gameAudio';

const ALL_TRACKS: BattleTrack[] = [WILD_BATTLE_TRACK, BOSS_BATTLE_TRACK];

describe('Notes — note nommée → fréquence', () => {
  test('les références du tempérament égal sont exactes', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440, 6);
    expect(noteFrequency('A3')).toBeCloseTo(220, 6);
    expect(noteFrequency('A5')).toBeCloseTo(880, 6);
    expect(noteFrequency('C4')).toBeCloseTo(261.6256, 3);
    expect(noteFrequency('C5')).toBeCloseTo(523.2511, 3);
  });

  test('une notation invalide renvoie 0 (jamais NaN)', () => {
    for (const bad of ['', 'H4', 'A', 'A#', 'A10', '4A', 'A-']) {
      expect(noteFrequency(bad)).toBe(0);
    }
  });
});

describe('Choix du thème', () => {
  test('les boss ont leur thème, les sauvages le thème commun', () => {
    expect(resolveBattleTrack(true)).toBe('boss');
    expect(resolveBattleTrack(false)).toBe('wild');
  });

  test('les fichiers optionnels sont distincts et servis depuis /audio', () => {
    expect(MUSIC_FILE_URLS.wild).not.toBe(MUSIC_FILE_URLS.boss);
    for (const url of Object.values(MUSIC_FILE_URLS)) {
      expect(url.startsWith('/audio/')).toBe(true);
    }
  });
});

describe('Données des morceaux', () => {
  test('chaque morceau a des voix et une boucle non vide', () => {
    for (const track of ALL_TRACKS) {
      expect(track.bpm).toBeGreaterThan(60);
      expect(track.steps).toBeGreaterThanOrEqual(16);
      expect(track.voices.length).toBeGreaterThanOrEqual(2);
      for (const voice of track.voices) {
        expect(voice.steps.length).toBeGreaterThan(0);
        expect(voice.gain).toBeGreaterThan(0);
      }
    }
  });

  test('toutes les notes des motifs sont valides', () => {
    for (const track of ALL_TRACKS) {
      for (const voice of track.voices) {
        for (const step of voice.steps) {
          if (step === null) continue;
          const freq = noteFrequency(step);
          expect(freq).toBeGreaterThan(30);
          expect(freq).toBeLessThan(5000);
        }
      }
    }
  });

  test('les percussions tombent dans la boucle', () => {
    for (const track of ALL_TRACKS) {
      const total =
        track.drums.kick.length + track.drums.snare.length + track.drums.hat.length;
      expect(total).toBeGreaterThan(0);
      for (const kind of ['kick', 'snare', 'hat'] as const) {
        for (const index of track.drums[kind]) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(track.steps);
        }
      }
    }
  });

  test('le thème de boss est plus dense que le thème sauvage', () => {
    // Le charley passe de croches (8 pas) à doubles-croches (16 pas) : c'est la
    // signature « plus tendu » du combat de boss.
    expect(BOSS_BATTLE_TRACK.drums.hat.length).toBe(BOSS_BATTLE_TRACK.steps / 2);
    expect(WILD_BATTLE_TRACK.drums.hat.length).toBe(WILD_BATTLE_TRACK.steps / 4);
  });
});

describe('Planification (pure)', () => {
  test('la durée d’un pas suit le tempo (double-croche)', () => {
    expect(stepDuration({ ...WILD_BATTLE_TRACK, bpm: 120 })).toBeCloseTo(0.125, 10);
    expect(stepDuration(WILD_BATTLE_TRACK)).toBeCloseTo(60 / 138 / 4, 10);
  });

  test('le plan couvre la boucle et reste horodaté dedans', () => {
    for (const track of ALL_TRACKS) {
      const plan = planForTrack(track);
      expect(plan.notes.length).toBeGreaterThan(0);
      expect(plan.drums.length).toBeGreaterThan(0);
      expect(plan.loopDuration).toBeCloseTo(track.steps * stepDuration(track), 10);

      for (const note of plan.notes) {
        expect(note.time).toBeGreaterThanOrEqual(0);
        expect(note.time).toBeLessThan(plan.loopDuration);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.freq).toBeGreaterThan(0);
        expect(note.gain).toBeGreaterThan(0);
      }
      for (const drum of plan.drums) {
        expect(drum.time).toBeGreaterThanOrEqual(0);
        expect(drum.time).toBeLessThan(plan.loopDuration);
        expect(drum.gain).toBeGreaterThan(0);
      }
    }
  });

  test('un motif plus court que la boucle est bien répété', () => {
    const plan = planForTrack(WILD_BATTLE_TRACK);
    const step = stepDuration(WILD_BATTLE_TRACK);
    // L'ornement aigu fait 16 pas pour une boucle de 32 : il doit donc sonner
    // aussi sur la seconde moitié de la boucle.
    const secondHalf = plan.notes.filter((n) => n.time >= 16 * step);
    expect(secondHalf.length).toBeGreaterThan(0);
  });

  test('le plan est déterministe', () => {
    for (const track of ALL_TRACKS) {
      expect(planForTrack(track)).toEqual(planForTrack(track));
    }
  });

  test('les deux thèmes sonnent différemment', () => {
    const wild = planForTrack(WILD_BATTLE_TRACK);
    const boss = planForTrack(BOSS_BATTLE_TRACK);
    expect(wild.loopDuration).not.toBeCloseTo(boss.loopDuration, 3);
  });

  test('le registre reste dans une plage audible cohérente', () => {
    for (const kind of Object.keys(TRACKS) as Array<keyof typeof TRACKS>) {
      for (const note of planForTrack(TRACKS[kind]).notes) {
        expect(note.freq).toBeGreaterThanOrEqual(40);
        expect(note.freq).toBeLessThanOrEqual(2000);
      }
    }
  });
});

describe('Séquenceur hors navigateur — jamais d’exception', () => {
  test('démarrer/arrêter la musique est un no-op silencieux sans contexte audio', () => {
    expect(() => startBattleMusic(false)).not.toThrow();
    expect(() => startBattleMusic(true)).not.toThrow();
    expect(() => startBattleMusic(true)).not.toThrow(); // même thème = no-op
    expect(() => stopBattleMusic()).not.toThrow();
    expect(isBattleMusicPlaying()).toBe(false);
  });

  test('le bouton muet bascule l’état persisté', () => {
    const wasMuted = isGameAudioMuted();
    try {
      setGameAudioEnabled(false);
      expect(isGameAudioMuted()).toBe(true);
      setGameAudioEnabled(true);
      expect(isGameAudioMuted()).toBe(false);
    } finally {
      setGameAudioEnabled(!wasMuted);
    }
  });
});
