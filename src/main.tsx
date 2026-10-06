import { createRoot } from 'react-dom/client'
import App from './ui/App'
import '@fontsource/cinzel/latin-500.css'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/im-fell-english-sc/latin-400.css'
import '@fontsource/alegreya/latin-400.css'
import '@fontsource/alegreya/latin-400-italic.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya-sans-sc/latin-500.css'
import '@fontsource/alegreya-sans-sc/latin-700.css'
import './ui/global.css'
// iOS Safari ignores user-scalable=no for pinch gestures: the map owns pinch zoom. Double-tap zoom is off via touch-action.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, e => e.preventDefault(), { passive: false })
createRoot(document.getElementById('root')!).render(<App />)
