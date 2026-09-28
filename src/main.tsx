import { hydrateRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './styles.css'
import { App } from './App'

hydrateRoot(document.getElementById('root')!, <App />)
// Cookieless page views, read in the Vercel dashboard. Served from /p/ (rewritten in
// vercel.json) because filter lists block /_vercel/insights/ by name. Outside Vercel it 404s.
inject({ scriptSrc: '/p/s.js', endpoint: '/p' })
