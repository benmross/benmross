import { renderToString } from 'react-dom/server'
import { App } from './App'

export { site } from './content'

/** The page as HTML, so crawlers and link previews read it without running any script. */
export const render = () => renderToString(<App />)
