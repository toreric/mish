#!/usr/bin/env node
// server.js

// ESM modules
import express from 'express'

// 1 configure our routes
const app = express()
app.use(express.json())

// 3 expose app
export default app

import routes from './app/routes.js'
routes(app)
// require('./app/routes').default(app) // CJS module

if (process.argv[2] !== '' && !process.argv[2]) {
  console.log('Usage: ' + process.argv[1] + ' home[ root [port] ]')
  console.log("  home = albums' home directory (default /home/<user>)")
  console.log('  root = chosen album root (within the home dirctory; default = not chosen)')
  console.log('  port = server port (default 3000)')
  console.log("Note: Parameter position is significant; use '' for default")
} else {

  //process.argv.forEach (function (val, index, array) {
  //  console.log (index + ': ' + val);
  //});

  // Image databases home directory and default album
  process.env.IMDB_HOME = process.argv[2] // albums' home
  process.env.IMDB_ROOT = process.argv[3] // album root
  process.env.PORT = process.argv[4]      // server port
  // set our port
  const port = process.env.PORT || 3000


  // set the static files location
  app.use("/", express.static("/")) // extra for localhost (? maybe superfluous?)
  app.use('/', express.static('public'))
  // app.use ('/', express.static(__dirname))
  // app.use ('/', express.static(__dirname + '/public'))

  // const { upload } = require('./app/routes').default

  // 2 start our app
  app.listen(port)

  console.log('\nExpress server, port ' + port + '\n')

}
