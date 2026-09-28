import { hydrateRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './styles.css'
import { App } from './App'

hydrateRoot(document.getElementById('root')!, <App />)
// Cookieless page views, read in the Vercel dashboard. Outside Vercel the script 404s harmlessly.
inject()
