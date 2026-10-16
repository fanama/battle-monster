# Musique de combat (fichiers optionnels)

La musique de combat est **synthétisée** par défaut (`src/lib/audio/battleMusic.ts`) :
aucun fichier n'est nécessaire.

Pour utiliser vos propres morceaux, déposez deux fichiers **ici** (ce dossier
est servi à la racine du site par Vite) :

| Combat            | Fichier attendu             |
| ----------------- | --------------------------- |
| Combat sauvage    | `public/audio/battle-wild.mp3` |
| Combat de boss    | `public/audio/battle-boss.mp3` |

Contraintes :

- format lu par `<audio>` (mp3, ogg, m4a, wav selon le navigateur) ;
- la lecture boucle : prévoyez un morceau qui boucle proprement (ou coupez à une
  frontière de mesure) ;
- volume appliqué par le jeu : `0.35` (l'élément audio ne traverse **pas** le
  bus Web Audio du jeu, il a donc son propre volume).

Comportement : à l'entrée en combat, la boucle synthétisée démarre
immédiatement puis, si le fichier se charge, il **prend le relais**. Fichier
absent ou illisible → la synthèse continue. Rien à configurer, aucun code à
changer.

Le bouton 🔊 / 🔇 de l'en-tête coupe les deux (et la préférence est conservée
dans `localStorage`, clé `monster-battle:audio`).
