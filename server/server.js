#!/usr/bin/env node
// server.js

// ESM modules
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the absolute path for the server environment
// (not necessary if started from there, see the node-express script)  
const __dirname = path.dirname(fileURLToPath(import.meta.url))
  // console.log('__dirname', __dirname) // is /home/tore/Arbeten/mish/server

// 1 configure our routes
const app = express()
app.use(express.json())

// 3 expose app
export default app

import routes from './app/routes.js'
routes(app)

if (process.argv[2] !== '' && !process.argv[2]) {
  console.log('Usage: ' + process.argv[1] + ' home[ root [port] ]')
  console.log("  home = albums' home directory (default /home/<user>)")
  console.log('  root = chosen album root (within the home dirctory; default = not chosen)')
  console.log('  port = server port (default 3000)')
  console.log("Note: Parameter position is significant; use '' for default")
} else {

  // Image databases home directory and default album
  process.env.IMDB_HOME = process.argv[2] // albums' home
  process.env.IMDB_ROOT = process.argv[3] // album root
  process.env.PORT = process.argv[4]      // server port
  // set our port
  const port = process.env.PORT || 3000
  // app.use('/', express.static('public')) NA
  // app.use('/', express.static(__dirname)) NA

  // Configuration that completely disables the browser cache for production static files
  const productionNoCache = {
    etag: false, // Disable ETag so browser doesn't do "304 Not Modified"
    maxAge: 0,   // Set cache lifetime to 0 seconds
    setHeaders: (res, path) => {
      // Force the browser to ALWAYS fetch live from disk on a Reload
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
    }
  };
  app.use('/', express.static(path.join(__dirname, 'public'), productionNoCache))

  // Map directly to the translations directory in order to make it always reachable
  app.use('/translations', express.static(path.join(__dirname, '../browser/translations'), productionNoCache))

  // Set the static image database files location
  app.use(process.argv[2], express.static(process.argv[2])) // UNSAFE to expose '/' (all!)
  // Can be made even safer through virtualization, see??

  // 2 start our app
  app.listen(port)

  console.log('\nExpress server, port ' + port + '\n')

}
