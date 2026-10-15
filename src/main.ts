import { mount } from 'svelte'
import './app.css'
import { initGameAudio } from './lib/audio/gameAudio'
import App from './App.svelte'

// Le contexte audio est créé au premier geste utilisateur : sans son au
// chargement (politique navigateur), prêt dès le premier clic.
initGameAudio()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
