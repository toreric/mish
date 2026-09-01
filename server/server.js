#!/usr/bin/env node
// server.js

// ESM modules
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './app/routes.js'

// Get the absolute path for the server environment
// (not necessary if started from there, see the node-express script)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
  // console.log('__dirname', __dirname) // is /home/tore/Arbeten/mish/server

// Configure our routes
const app = express()
app.use(express.json())
// Expose app
export default app

if (process.argv.length < 3) {
  console.log('Usage: ' + process.argv[1] + ' home[ root [port] ]')
  console.log("  home = albums' home directory (default /home/<user>)")
  console.log('  root = chosen album root (within the home dirctory; default = not chosen)')
  console.log('  port = server port (default 3000)')
  console.log("Note: Parameter position is significant!")
} else {

  // Image databases home directory and default album
  process.env.IMDB_HOME = process.argv[2]       // albums' home
  process.env.IMDB_ROOT = process.argv[3] || '' // album root
  process.env.PORT = process.argv[4] || 3000    // server port
  const port = process.env.PORT // set our port

  // Configuration that completely disables the browser cache for production static files
  const productionNoCache = {
    etag: false, // Disable ETag so browser doesn't do "304 Not Modified"
    maxAge: 0,   // Set cache lifetime to 0 seconds
    setHeaders: (res, path) => {
      // Force the browser to ALWAYS fetch live from disk on a Reload
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
      res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:3000; font-src 'self' data:;")
    }
  };

  // Static routes
  app.use(express.static(path.join(__dirname, 'public'), productionNoCache))
  app.use('/', express.static(path.join(__dirname, 'public'), productionNoCache))
  // Prepare for reference to links (in the captions) where documents reside
  app.use('/text', express.static(path.join(__dirname, 'text'), productionNoCache))
  // Map directly to the translations directory in order to make it always reachable
  app.use('/translations', express.static(path.join(__dirname, '../browser/translations'), productionNoCache))

  // Set the static image database files location
  if (process.env.IMDB_HOME && process.env.IMDB_HOME !== 'undefined') {
    app.use(process.argv[2], express.static(process.argv[2])) 
  }
  // Can be made even safer through virtualization, how, see ??

  // Set the content security policy (CSP)
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:3000; font-src 'self' data:;")
    next()
  })

  // Add our routing details
  routes(app)

  // Start our app
  app.listen(port, () => {
    console.log('\nExpress server, port ' + port + '\n')
  })

}
