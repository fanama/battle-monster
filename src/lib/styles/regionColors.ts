/**
 * Palette par région — source **unique** partagée par l'arène de combat
 * (`App.svelte`) et le HUD (`RunHud.svelte`) : le fond de l'arène reprend
 * exactement les couleurs de la région courante (Verdure émeraude, Abysse
 * azur, Braise ardoise/ember, Céleste violet).
 *
 * `arenaBg` est un `background-image` CSS **en couches** (raw CSS, comme
 * `TYPE_COLORS[*].ambient`) : lueur de sol colorée → vignette d'assombrissement
 * → dégradé vertical de la région. Les autres clés sont des classes Tailwind
 * littérales (nécessaire au scan Tailwind 4 — ne jamais les concatter).
 */
export interface RegionColors {
  /** Fond de l'arène : `background-image` en 3 couches (raw CSS). */
  arenaBg: string;
  /** Bordure de l'arène (classe littérale, remplace `border-stone-600`). */
  border: string;
  /** Accent dégradé — pastille du HUD. */
  accent: string;
  /** Texte accentué — nom de la région. */
  text: string;
}

export const REGION_COLORS: Record<string, RegionColors> = {
  'region-verdure': {
    arenaBg: `
      background-image:
        radial-gradient(ellipse 65% 45% at 50% 88%, rgba(74, 222, 128, 0.25), transparent 70%),
        linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 35%),
        linear-gradient(to bottom, #052e16, #14532d 55%, #166534);
    `,
    border: 'border-emerald-700',
    accent: 'from-emerald-600 to-green-500',
    text: 'text-emerald-300',
  },
  'region-abysse': {
    arenaBg: `
      background-image:
        radial-gradient(ellipse 65% 45% at 50% 88%, rgba(56, 189, 248, 0.25), transparent 70%),
        linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 35%),
        linear-gradient(to bottom, #082f49, #0c4a6e 55%, #155e75);
    `,
    border: 'border-sky-700',
    accent: 'from-sky-600 to-blue-500',
    text: 'text-sky-300',
  },
  'region-braise': {
    arenaBg: `
      background-image:
        radial-gradient(ellipse 70% 50% at 50% 88%, rgba(251, 146, 60, 0.35), transparent 70%),
        linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 35%),
        linear-gradient(to bottom, #431407, #7f1d1d 55%, #9a3412);
    `,
    border: 'border-orange-700',
    accent: 'from-orange-600 to-red-500',
    text: 'text-orange-300',
  },
  'region-celeste': {
    arenaBg: `
      background-image:
        radial-gradient(ellipse 65% 45% at 50% 88%, rgba(232, 121, 249, 0.25), transparent 70%),
        linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 35%),
        linear-gradient(to bottom, #2e1065, #4c1d95 55%, #701a75);
    `,
    border: 'border-violet-700',
    accent: 'from-violet-600 to-fuchsia-500',
    text: 'text-fuchsia-300',
  },
};
