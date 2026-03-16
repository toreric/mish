// app/routes.js

// const { statfs } = require('fs/promises') EC
// import path, { dirname } from 'node:path'
import path from 'node:path'
import ProMise from 'bluebird'
// const path = require('path')
// const ProMise = require('bluebird')
// import fisy from 'fs'
import { access, writeFile, readFile, readdir, open } from 'node:fs/promises'
import fs from 'node:fs'

import multer from 'multer'
import { execSync } from 'child_process'
import bodyParser from 'body-parser'
import util from 'util'
// const multer = require('multer')
// const execSync = require('child_process').execSync
// const bodyParser = require('body-parser')
// const util = require('util')
import { exec as execute } from 'child_process'

import SQLite from 'better-sqlite3'
// const SQLite = require('better-sqlite3')

// Configure storage engine and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    // cb(null, path.basename(file.originalname).replace(/\.[^.]*$/, '') + '-' + Date.now() + path.extname(file.originalname))
    cb(null, path.basename(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpe?g|tif{1,2}|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
}

// Initialize upload middleware and with file size limit
const upload = () => multer({
  storage: storage,
  limits: { fileSize: 16000000, files: 1 }, // 15.25MiB file size limit
  fileFilter: fileFilter
})

export { upload }

export default function(app) { // Start module.exports
  // const fs = ProMise.promisifyAll(require('fs')) // ...Async() suffix
  // const fs = ProMise.promisifyAll(fisy) // sets ...Async() suffix
  // const execP = ProMise.promisify(require('child_process').exec)
  const exec = util.promisify(execute) // modern exec replaces execP
  
  // const cpUpload = upload.fields([{ name: 'file' }]) // default fileKey name
  // Error handler for file filter rejections
  app.use((err, req, res, next) => {
    res.status(400).send(err.message);
  })

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());


  // This row should be moved to the 'login' and there followed at end by 'setdb.close'
  // in order to free it for construction of an admin gui for settings management:
  const setdb = new SQLite('_imdb_settings.sqlite')

  let n_upl = 0 // Upload counter
  let mailsender = 'savarhembygd@telia.com' // mailSender/host/provider/smtpRelay
  let WWW_ROOT = path.resolve('.') // Present work directory
  let IMDB_HOME = imdbHome() // Root directory where IMDB_ROOTs are found
  //  IMDB_ROOT is the image database root directory:
  let IMDB_ROOT = execSync('echo $IMDB_ROOT').toString().trim()
  if (IMDB_ROOT === '""') IMDB_ROOT = ''
  let IMDB_DIR = ''  // Actual image database subdirectory
  let IMDB = ''
  let USER = ''
  let picFound = '' // Name of special(temporary) search result album
  let allfiles = [] // For /imagelist use
  let RID = '----'  // Random (user) identity (take from picFound, changed at reload)

  // ===== Make a synchronous shell command formally 'asynchronous'(cf. asynchronous execP)
  // let cmdasync = async (cmd) => {return execSync(cmd)}
  // ===== ABOUT COMMAND EXECUTION
  // ===== `execP` provided a non-blocking, ProMise-based approach to executing commands, which is generally preferred in Node.js applications for better performance and easier asynchronous handling.
  // ===== 'exec' is the same but native (not Bluebird, which is a bit oldfashion>2020)
  // ===== `cmdasync`, using `execSync`, offers a synchronous alternative that blocks the event loop, which might be useful in specific scenarios but is generally not recommended for most use cases due to its blocking nature. `a = await cmdasync(cmd)` and `a = execSync(cmd)` achieve the same end result of executing a command synchronously. The usage differs based on the context (asynchronous with `await` for `cmdasync` versus direct synchronous call for `execSync`). The choice between them depends on whether you're working within an asynchronous function and your preference for error handling and code style.

  // 30 black, 31 red, 32 green, 33 yellow, 34 blue, 35 magenta, 36 cyan, 37 white, 0 default
  // Add '1;' for bright, e.g. '\x1b[1;33m' is bright yellow, while '\x1b[31m' is red, etc.

  const BGRE = '\x1b[1;32m' // Bright green
  const BYEL = '\x1b[1;33m' // Bright yellow
  const BLUE = '\x1b[1;34m' // Bright blue
  const RED  = '\x1b[1;31m' // Red
  const RSET = '\x1b[0m'    // Reset

  const LF = '\n'   // Line Feed == New Line
  const BR = '<br>' // HTML line break
  // Max lifetime(minutes) after last access of a temporary search result album:
  const toold = 60

  //#Region = code regions, only for the editors's minilist in the right margin!
  // ##### R O U T I N G  E N T R I E S
  // Check 'Express route tester'!
  // ##### General passing point
  //#region ROUTING
  app.all('/*anykey', async (req, res, next) => {
          // console.log("original req.body =", req.body) undefined
    // if (req.originalUrl !== '/upload') { // Upload with dropzone: 'req' used else!
      // if (req.originalUrl === '/uploads') {
      //   next()
      // }

      var tmp = req.get('imdbroot')
      if (tmp) {
        IMDB_ROOT = decodeURIComponent(tmp)
        IMDB_DIR = decodeURIComponent( req.get('imdbdir') )
        IMDB = IMDB_HOME + '/' + IMDB_ROOT
        USER = decodeURIComponent(req.get('username'))
        picFound = req.get('picfound')
        // Borrow the random identity RID from picFound!
        RID = picFound.replace(/^.*\.([^.]{4})$/, '$1')
        if (RID.length !== 4) RID = '----'
        // If picFound is already defined it must be preserved even if it
        // isn't touched since long ago. We should 'touch' that directory, or
        // possibly recreate it, since it may even be erased by another user:
        if (IMDB && picFound) {

          // // OLD WITH BUEBIRD
          // try {
          //   var cmd = 'touch ' + IMDB + '/' + picFound
          //   var cmd1 = '/ && touch ' + IMDB + '/' + picFound + '/.imdb'
          //   await execP(cmd + cmd1)
          // } catch (error) { // command failed, dir not found
          //   cmd = 'mkdir ' + IMDB + '/' + picFound
          //   await execP(cmd + cmd1)
          // }
          //   // console.log(BYEL + cmd + cmd1 + RSET) // Does reveal paths!

          // NEW ATTEMPT WITH AWAIT BY util.promisify,seems OK
          try {
            var cmd = 'touch ' + IMDB + '/' + picFound
            var cmd1 = '/ && touch ' + IMDB + '/' + picFound + '/.imdb'
            await exec(cmd + cmd1)
          } catch (err) { // command failed, picFound dir not found
            cmd = 'mkdir ' + IMDB + '/' + picFound
            await exec(cmd + cmd1)
          }
        }
      }
      // The server automatically removes old search result temporary albums:
      // Remove too old picFound directories (with added random .01yz)
      cmd = 'find -L ' + IMDB + ' -type d -name "§*" -amin +' + toold + ' | xargs rm -rf'
      // await cmdasync(cmd) // ger direktare diagnos
      await exec(cmd)
      // console.log(BYEL + cmd + RSET)

      // tmp = decodeURIComponent(req.originalUrl)
      // if (tmp !== '/execute/' && tmp !== '/filestat/' && !tmp.startsWith(IMDB)) {
      //   console.log(BGRE + tmp + RSET)
      //     // console.log("***nearest req.body =", req.body) undefined
      // }

      let show_imagedir = true // For debug of directories printout
      if (show_imagedir) {     // and also each ”tmp” printout
        console.log(BLUE + req.originalUrl + RSET)
        console.log('  WWW_ROOT:', WWW_ROOT)
        console.log(' IMDB_HOME:', IMDB_HOME)
        console.log('      IMDB:', IMDB)
        console.log(' IMDB_ROOT:', IMDB_ROOT)
        console.log('  IMDB_DIR:', IMDB_DIR)
        console.log('  picFound:', picFound)
        console.log('      USER:', USER)
      }
      // console.log(process.memoryUsage())
      next() // pass control to the next handler
    // }
  })

  // ##### Execute a shell command
  //region execute
  app.get('/execute', async (req, res) => {
    // console.log(BGRE + '/execute' + RSET)
    var cmd = decodeURIComponent(req.get('command'))
      // console.log(BLUE + cmd + RSET) // hide this to protect image paths
    try {
      // NOTE: exec seems to use ``-ticks, not $()
      // Hence don't pass "`" without escape
      cmd = cmd.replace (/`/g, "\\`")
      var resdata = (await exec (cmd)).stdout
      res.location ('/')
      res.send (resdata)
      //res.end ()
    } catch (err) {
        console.error ("`" + cmd + "`")
        console.error (err.message)
        res.location ('/')
      res.send (err.message)
    }
  })

  // ##### Return file information
  //#region filestat
  app.get('/filestat', async (req, res) => {
    // console.log(BGRE + '/filestat' + RSET)
    var file = decodeURIComponent(req.get('path'))
    file = IMDB + file
    // This is an emergency solution, which was necessary since the 'filstat'
    // server address seems to be excessively triggered by the reactive behaviour
    // started by the 'DialogInfo' component. It is used by the 'MenuImage' component
    // when the menu's 'Information' entry is clicked:
    if (await notFile(file)) {
        // console.error('Illegal filestat call, file =', file)
      return
    }
      // NOTE: See with this log-print that /filestat is mostly 'doubly triggered'!
      // console.log('.' + file.slice(IMDB_HOME.length))
    var LT = req.get('intlcode') // Language tag for dateTime
    if (!LT) LT = 'sv-se' // Swedish (ISO) date order
    if (LT === 'en-us') LT = 'en-uk' // European date order
      // console.log('fileStat',LT)
    var missing = 'NA'
    var stat = fs.statSync(file)
      // console.log('fileStat',stat)
    // linkto is relative path to the original file
    // linktop is the absolute path to pe used for the imgErr check
    var linkto = "", linktop
    var syml = await isSymlink(file)
    if (syml) {
      linkto = execSync("readlink " + file).toString().trim ()
      if (linkto [0] !== '.') linkto = './' + linkto //if symlink in the root album
      linktop = IMDB + linkto.replace(/^(\.\.?\/)+/, "/") //
    }
    // Exclude IMDB from `file`, feb 2022, in order to difficultize
    // direct access to the original pictures on the server.
    var errimg = "not available"
    var filex = '.' + file.slice (IMDB.length)
    var fileStat = ''

    fileStat += stat.size/1000000 + ' Mb' + BR
    let tmp = execSync("exif_dimension " + file).toString().trim()
    if (tmp === 'missing') tmp = missing
    fileStat += tmp + BR

    tmp = (new Date (execSync("exif_dateorig " + file))).toLocaleString(LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    if (tmp.indexOf ("Invalid") > -1) {tmp = missing}
    fileStat += tmp + BR //created

    tmp = stat.mtime.toLocaleString(LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    fileStat += tmp + BR //modified

    if (linkto) {
      errimg = await imgErr(linktop)
      fileStat += linkto + BR + errimg + BR + filex
        // console.log('fileStat',fileStat)
    } else {
      errimg = await imgErr(file)
      fileStat += linkto + BR +  errimg + BR + filex
        // console.log('fileStat',fileStat)
    }
    res.location('/')
    res.send (fileStat)
  })

  // ##### Return a user's credentials for login, or return
  //       all available user statuses and their allowances
  //#region login
  app.get('/login', async (req, res) => {
    // console.log(BGRE + '/login' + RSET)
    USER = decodeURIComponent(req.get('username'))
    var password = ''
    var status = ''
    var allow = ''
    try {
      if (USER) {
        console.log(BYEL + RID + '@' + USER + ': logged in' + RSET)
        // console.log('  userName: "' + USER + '"')
        let row = setdb.prepare('SELECT pass, status FROM user WHERE name = $name').get({name: USER})
        if (row) {
          password = row.pass
          status = row.status
        }
        row = setdb.prepare('SELECT allow FROM class WHERE status = $status').get({status: status})
        if (row) {
          allow = row.allow
        }
        let rows = setdb.prepare('SELECT name FROM user WHERE pass = ? ORDER BY name').all('')
        var freeUsers = []
        for (let i=0;i<rows.length;i++) {
          freeUsers[i] = rows[i].name
        }
        freeUsers = freeUsers.join(', ')
        console.log(' freeUsers:', freeUsers)

        res.location('/')
        // console.log(password +LF+ status +LF+ allow +LF+ freeUsers)
        res.send(password +LF+ status +LF+ allow +LF+ freeUsers +LF+ IMDB_ROOT)

      } else { // Send all recorded user statuses and their allowances, formatted
        console.log(BYEL + '\n\nRELOADING MISH' + RSET + '\nGet the table of user rights')
        RID = '----'
        let rows = setdb.prepare('SELECT * FROM class ORDER BY status').all()
        var allowances = ''
        for (let j=0;j<rows.length;j++) {
          allowances +=  rows[j].status + ' '
        }
          allowances += '\n──────────────────────────────────────────────\n'
        let al = rows[0].allow.length
        for (let i=0;i<al;i++) {
          for (let j=0;j<rows.length;j++) {
            if (j) { var space = '     ' } else { space = '    ' }
            allowances += space +(rows[j].allow)[i].replace('0', '.').replace('1', 'x')
          }
          allowances += '     \n'
        }
        allowances += '──────────────────────────────────────────────\n'
          // console.log(allowances.trim())
        res.location('/')
        res.send(allowances.trim())
      }
    } catch(err) {
      console.log('Sqlite(?)error:', err.message)
      res.location('/')
      res.send('Sqlite(?)error: ' + err.message)
    }
  })

  // ##### Get full-size (djvu?) file   CHECK path
  //#region fullsize
  app.get('/fullsize', async (req, res) => {
    console.log(BGRE + '/fullsize' + RSET)
    var fileName = decodeURIComponent(req.get('path'))
    // var fileName = req.get('path') // with path but servers may remove first `/`:
    if (fileName.slice (0, 1) !== "/") fileName = "/" + fileName;
    //console.log (fileName)
    // Make a temporary .djvu file with the mkdjvu script
    // Plugins missing for most browsers January 2019
    //var tmpName = execSync ('mkdjvu ' + fileName)
    // Make a temporary png file instead (much bigger, sorry!)
      let pwd0 = await exec('pwd')
      console.log(pwd0.stdout.trim())
      console.log(WWW_ROOT)
    // Now mkpng will deliver the file 'tmpName'
    // into the pwd directory = WWW_ROOT
    let cmd = 'mkpng ' + IMDB + fileName;
      console.log(cmd);
    var tmpName = await exec(cmd); // 'await exec' delivers both stdout and stderr
      console.log(tmpName.stdout);
    res.location ('/')
    res.send (tmpName.stdout)
    //res.end ()
    console.log ('Started fullsize image generation')
  })

  // ##### Find subdirs which are album roots
  //#region rootdir
  app.get('/rootdir', async function(req, res) {
    console.log(BGRE + '/rootdir' + RSET)
      var dirlist = await readSubdir(IMDB_HOME)
        // console.log(IMDB_HOME, dirlist)
      dirlist = dirlist.join(LF)
      res.location('/')
      res.send(dirlist)
  })

  // ##### Get IMDB(image 'data base') directories list,
  //       i.e. get all possible album directories, recursive
  //#region imdbdirs
  // *********************************************************************
  // NOTE Do not move 'getAlbumDirs' in 'z' to 'menu-main.gjs' in order to
  // balance code lines more reasonably between source files!  Since it is
  // also called by 'updateTree' which is called from 'menu-image.gjs'!
  // *********************************************************************
  app.get('/imdbdirs', async function(req, res) {
    console.log(BGRE + '/imdbdirs' + RSET)
    await new Promise(z => setTimeout(z, 200))
    var allowHidden = req.get('hidden')
    if (IMDB_DIR.indexOf(picFound) === -1) {
      // Refresh picFound: the shell commands must execute in sequence (don't split cmd)
      let pif = IMDB + '/' + picFound
      let cmd = 'rm -rf ' + pif + ' ; mkdir ' + pif + ' && touch ' + pif + '/.imdb'
      // await cmdasync(cmd) // better diagnosis
      await exec(cmd)
      // console.log(BYEL + cmd + RSET)
      console.log('Refreshed the picFound tmp album')
    }
    setTimeout(function() {
      allDirs().then(dirlist => { // dirlist entries start with the root album
          console.log('dirlist 1:', dirlist)
        areAlbums(dirlist).then(async (dirlist) => {
          // dirlist = dirlist.sort()
            console.log('dirlist 2:', dirlist)
          var albumLabel
          var dircoco = [] // directory content counters
          var dirlabel = [] // album label thumbnail paths

          // Hidden albums are listed in _imdb_ignore.txt, create if missing
          var fd
          var ignorePaths = IMDB + "/_imdb_ignore.txt"
          try {
            const fd = await open(ignorePaths, 'r')
            fd.close()
          } catch(err) {
            fd = await open(ignorePaths, 'w') // created
            fd.close()
          }
          // Remove hidden albums from the list if allowHidden is 'false'
          if (allowHidden !== 'true') {
            // An _imdb_ignore line/path may/should start with just './'(if not #)
              // console.log(await exec('cat ' + ignorePaths))
            var ignore = (await exec('cat ' + ignorePaths)).stdout.toString().trim().split(LF)
              // console.log('ignore:', ignore)
            for (let i=0; i<dirlist.length; i++) {
              for (let j=0; j<ignore.length; j++) {
                if (ignore[j].slice(0, 1) === '#') ignore[j] = ''
                ignore[j] = ignore[j].replace(/^[^/]*/, '')
                for (let i=dirlist.length-1;i>-1;i--) {
                  if (ignore[j] && ignore[j].slice(0, 1) !== '#') {
                      // console.log('ignore[j]', ignore[j]);
                      // console.log('dirlist[i]', dirlist[i]);
                    if (ignore[j] && (dirlist[i] + '/').startsWith(ignore[j] + '/')) {
                      dirlist.splice(i, 1)
                      break
                    }
                  }
                }
              }
            }
          }
          // First check the file lists against _mini_file 'mothers' in order to
          // eliminate (the count) of orphan _mini_-files: may appear by accident!
          for (let i=0; i<dirlist.length; i++) {
              // console.log(RED + dirlist[i] + RSET)
            let cmd = "echo -n `ls " + IMDB + dirlist[i] + "/_mini_* 2>/dev/null`"
            let pics = (await exec(cmd)).stdout
              // console.log(RED + 'pics:\n' + pics.toString().trim() + RSET)
            if (pics) { // don't check empty albums
              pics = pics.toString().trim().split(' ')
              for (let j=0;j<pics.length;j++) {
                let iname = pics[j].replace(/^.*\/_mini_/, '').replace(/\.[^.]+$/, '.')
                  // console.log(BGRE + i + ' ' + iname + RSET)
                try {
                  cmd = 'ls ' + IMDB + dirlist[i] + '/' + iname + '*'
                    // console.log(BYEL + cmd + RSET)
                  let file = (await exec(cmd)).stdout.toString().trim()
                    // console.log(BYEL + file + RSET)
                } catch {
                    // console.log('rm -f ' + IMDB + dirlist[i] + '/_mini_' + iname + '*')
                  await exec('rm -f ' + IMDB + dirlist[i] + '/_mini_' + iname + '*')
                    // console.log('rm -f ' + IMDB + dirlist[i] + '/_show_' + iname + '*')
                  await exec('rm -f ' + IMDB + dirlist[i] + '/_show_' + iname + '*')
                }
              }
            }
          }
         // Count images by thumbnails and select one randomly
         // to be used as subdirectory label image
         for (let i=0; i<dirlist.length; i++) {
            let cmd = "echo -n `find " + IMDB + dirlist[i] + " -maxdepth 1 -type l -name '_mini_*' | grep -c ''`"
            let nlinks = (await exec(cmd)).stdout/1 // Get no of linked images
            cmd = "echo -n `ls " + IMDB + dirlist[i] + "/_mini_* 2>/dev/null`"
            let pics = (await exec(cmd)).stdout // Get all images
              // console.log(pics)
            pics = pics.toString().trim().split(" ")
            if (!pics[0]) {pics = []} // Remove a "" element
            let npics = pics.length // No of images in the album
            if (npics) {
              let k, n = 1 + Number((new Date).getTime().toString().slice(-1))
              // Instead of seeding, loop n(1 to 10) times to get some variation:
              for (let j=0; j<n; j++) {
                k = Math.random()*npics
              }
              albumLabel = pics[Number(k.toString().replace(/\..*/, ""))]
            } else {albumLabel = "€" + dirlist[i]} // Mark empty albums
            // Count the number of subdirectories; albums are in sorted order
            var subs = 0
            if (i) {
              for (let j=i+1; j<dirlist.length; j++) {
                if ((dirlist[j] + '/').startsWith(dirlist[i] + '/')) ++subs
              }
            } else {
              subs = dirlist.length - 1 // All subsubs to root
            }
            if (nlinks) {
              npics = "(" +(npics - nlinks) + "+" + nlinks + ")"
            } else {
              npics = "(" + npics + ")"
            }
            if (subs) {npics += ' ' + subs + '‡'} // text!
            dircoco.push(npics)
              // console.log(RED + i + ' ' + albumLabel + RSET)
            dirlabel.push(albumLabel)

          }
          for (let i=0; i<dirlist.length; i++) {
            // console.log('A i dirlabel[i]',i,dirlabel[i])
            if (dirlabel[i].slice(0, 1) === "€") {
              albumLabel = dirlabel[i].slice(1)
              dirlabel[i] = ""
              for (let j=i+1; j<dirlist.length; j++) { //Take any subalbum's minipic if available
                if (albumLabel === dirlabel[j].slice(IMDB.length).slice(0, albumLabel.length)) {
                  dirlabel[i] = dirlabel[j]
                  // console.log('B i dirlabel[i]',i,dirlabel[i])
                  break
                }
              }
            }
          }
          // Add a mark for hidden files(if not removed already)
          if (allowHidden === 'true') {
            // An _imdb_ignore line/path may/should start with just './'(if not #)
            let ignore = (await exec('cat ' + ignorePaths)).stdout.toString().trim().split(LF)
            for (let j=0; j<ignore.length; j++) {
              for (let i=0; i<dirlist.length; i++) {
                // console.log('C i dirlabel[i]',i,dirlabel[i])
                if (ignore[j] && ignore[j].slice(0, 1) !== '#') {
                  ignore[j] = ignore[j].replace(/^[^/]*/, '')
                  if (ignore[j] && (dirlist[i] + '/').startsWith(ignore[j] + '/')) dircoco[i] += " *"
                }
              }
            }
          }
          let dirtext = dirlist.join(LF)
          dircoco = dircoco.join(LF)
          dirlabel = dirlabel.join(LF)

          // *********************************************************************
          // Start with 3 extra lines to be discarded by the receiver: Node
          // version, userDir=IMDB_HOME, and wwwDir=WWW_ROOT. This is where the
          // IMDB_HOME server parameter is transferred to the browser!
          dirtext = "NodeJS " + process.version.trim() + LF + IMDB_HOME + LF + WWW_ROOT + LF + dirtext
          // *********************************************************************

          res.location('/')
            // console.log('dirtext:' + BYEL + LF + dirtext + RSET)
            // console.log('dircoco:' + BYEL + LF + dircoco + RSET)
            // console.log('dirlabel:' + BYEL + LF + dirlabel + RSET)
          res.send(dirtext + LF + dircoco + LF + dirlabel)
          //res.end()
          console.log('Directory information sent from server')
        })
      }).catch(function(error) {
        res.location('/')
        res.send(error.message)
      })
    }, 500) // Was 1000
  })

  // ##### Get all images in IMDB_DIR using 'findFiles' with readdir,
  //       Was Bluebird support
  //#region imagelist
  app.get('/imagelist', async function(req, res) {
    console.log(BGRE + '/imagelist' + RSET)
    // NOTE: Reset allfiles here, since it isn't refreshed by an empty album!
    // allfiles = undefined
      // console.log('IMDB_ROOT = "' + IMDB_ROOT + '"')
      // console.log('IMDB_DIR = "' + IMDB_DIR + '"')

    var files = await findFiles(IMDB_DIR)
      files ??= [] // equals
      if (!files) {files = []}
        // console.log('files from FINDFILES:', files)
      var origlist = ''
      for (var i=0; i<files.length; i++) {
        var file = files [i]
        // Check the file name and that it is not a broken link: !`find <filename> xtype l`
        if (acceptedFileName(file.slice((IMDB + IMDB_DIR).length + 1)) && !brokenLink(file)) {
          origlist = origlist +'\n'+ file
        }
      }
      origlist = origlist.trim()
      //////////////////////////////////////////////////////////
      // Get, check and package quadruple file names:
      // 1 path from album root of full size origin in the album
      // 2 server absolute path of 640x640 show png "
      // 3 server absolute path of 150x150 mini png "
      // 4 the image name = the file name except extension
      // Note: png is hiding a jpg or gif, resized from original
      //////////////////////////////////////////////////////////
      // Next to them, two '\n-free' metadata lines follow:
      // 5 Xmp.dc.description
      // 6 Xmp.dc.creator
      // 7 A '&' or the path to the origin if it is a symlink
      // In case of symlink, files 2 and 3 are also symlinks
      //////////////////////////////////////////////////////////
        // console.log('files to PKGFILENAMES:' + LF + origlist)
      pkgfilenames(origlist).then(() => { // Will make 'allfiles'
        // pkgfilenames prints an initial console.log message,
        // which is completed a few lines below this 
        if (!allfiles) {allfiles = ''}
        res.location('/')
          // console.log(BYEL + 'allfiles:', allfiles + RSET)
        res.send(allfiles)
        //res.end()
        // console.log(BYEL + RID + '@' + USER + ': ' + IMDB_ROOT + IMDB_DIR + RSET)
        console.log(`...information for ${BYEL}${IMDB_ROOT}${IMDB_DIR}${RSET} sent from server`) // completed message
      }).catch(function(error) {
        res.location('/')
        res.send(error.message)
      })
    // })
  })

  // ##### Get sorted file name list (= get order)
  //#region sortlist
  app.get('/sortlist', async function(req, res) {
    console.log(BGRE + '/sortlist' + RSET)
    const imdbtxtpath = IMDB + IMDB_DIR + '/_imdb_order.txt'
    try { // Open _imdb_order.txt
      const fd = await open(imdbtxtpath, 'r') // check
      // fs.close(fd)
      fd.close()
    } catch { // Create _imdb_order.txt if missing
      try {
        const fd = await open(imdbtxtpath, 'w') // create
        // fs.close(fd)
        fd.close()
        execSync('chmod 664 ' + imdbtxtpath)
      } catch { // Maybe something in the path is wrong
        // console.error(error.message) hide path to albums
        // console.error(RED + 'Error in album path' + RSET)
        console.error(RED + 'Error in album path: ' + RSET + imdbtxtpath)
        res.location('/')
        return res.send('Error!')
      }
    }
    try {
      const names = await readFile(imdbtxtpath, 'utf8')
      res.send(names)
      console.info('File order sent from server')
    } catch {
      console.error(`${RED}Error in album path?${RSET}`)
      res.location('/')
      res.send('')
    }
  })

  //   readFile (imdbtxtpath)
  //   .then(names => {
  //       // console.log ('/sortlist/:names' +'\n'+ names) // names <buffer> here converts to <text>
  //     res.send(names) // Sent buffer arrives as text
  //   }).then(console.info('File order sent from server'))
  //   .catch(function(error) {
  //     console.error(RED + 'Error in album path?' + RSET)
  //     res.location('/')
  //     res.send('')
  //   })
  // })

  // ##### Save the _imdb_order.txt file
  //#region saveorder
  app.post('/saveorder', async function(req, res, next) {
    console.log(BGRE + '/saveorder' + RSET)
    var file = IMDB + IMDB_DIR + '/_imdb_order.txt'
    execSync('touch ' + file + '&&chmod 664 ' + file) // In case not yet created
    var body = []
    req.on ('data', (chunk) => {
      // body will be a Buffer array: <buffer 39 35 33 2c 30 ... >, <buf... etc.
      body.push (chunk)
    }).on ('end', () => {
      // Concatenate; then change the Buffer into String
      body = Buffer.concat (body).toString ()
      // At this point, do whatever with the request body (now a string)
      writeFile (file, body).then (function () {
        console.log ("Saved file order ")
        //console.log ('\n'+body+'\n')
      })
      res.on('error', (err) => {
        console.error(err.message)
      })
      setTimeout (function () {
        // stay at the index.html file:
        res.sendFile ('index.html', {root: WWW_ROOT + '/public/'})
      }, 200)
    })
  })

  // ##### Save Xmp.dc.description and Xmp.dc.creator using exiv2
  //#region savetext
  app.post('/savetext', async function(req, res, next) {
    console.log(BGRE + '/savetext' + RSET)
    var body = []
    req.on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      body = Buffer.concat(body).toString()
      // Here `body` has the entire request body stored in it as a string
      var tmp = body.split('\n')
      var fileName = IMDB_HOME + '/' + tmp[0].trim() // All path included here @***
      var msgName = fileName.slice(IMDB_HOME.length)

      let okay = fs.constants.W_OK | fs.constants.R_OK
      access(fileName, okay, async err => {
        if (err) {
          res.send("Cannot write to " + msgName)
          console.log(err, 'ERROR', err.length)
          console.error('NO WRITE PERMISSION to ' + msgName)
        } else {
          console.log('Xmp.dc metadata will be saved into ' + msgName)
          body = tmp [1].trim() // These trimmings are probably superfluous
          // The set_xmp_... command strings will be single quoted, avoiding
          // most Bash shell interpretation. Thus slice out 's (single quotes)
          // within 's (cannot be escaped just simply); makes Bash happy :)
          // NEEDS better explanation?!:
          body = body.replace(/'/g, "'\\''")
          //console.log(fileName + " '" + body + "'")
          var mtime = fs.statSync(fileName).mtime // Object
          //console.log (typeof mtime, mtime)
          execSync('set_xmp_description ' + fileName + " '" + body + "'") // for txt1
          body = tmp [2].trim() // These trimmings are probably superfluous
          body = body.replace(/'/g, "'\\''")
          //console.log (fileName + " '" + body + "'")
          if (open)
          execSync('set_xmp_creator ' + fileName + " '" + body + "'") // for txt2
          // Reset modification time, this was metadata only:
          execSync('touch -d "' + mtime + '" "' + fileName + '"')
          res.send('')
          await new Promise(z => setTimeout (z, 888))
          await sqlUpdate (fileName) // with path @***
        }
      })
    })
    //res.sendFile ('index.html', {root: WWW_ROOT + '/public/'}) // stay at the index.html file
  })

  // ##### Update one or more database entries
  // NOTE: 'req.body' handlings depend on bluebird/multer, unclear how?
  // THUS: Please modify carefully! (a sipmle remove caused crossdomain trouble)
  //#region sqlupdate
  app.post('/sqlupdate', async function(req, res, next) {
    console.log(BGRE + '/sqlupdate' + RSET)
      // console.log("req.body =", req.body)
    let filepaths = req.body.filepaths
    //console.log ('SQLUPDATE', filepaths)
    let files = filepaths.trim().split(LF)
    for (let i=0; i<files.length; i++) {
      await new Promise(z => setTimeout(z, 888))
      await sqlUpdate(files[i]) // One at a time
    }
    res.location('/')
    res.send('')
    //res.end()
  })

  // ##### Search text, case insensitively, in _imdb_images.sqlite
  //#region search
  // This (with multer().none()) can even take Formdata:
  // app.post('/search', multer().none(), async function(req, res, next) {
  app.post('/search', async function(req, res, next) {
    console.log(BGRE + '/search' + RSET)
      // console.log(BYEL + "req.body =" + RSET, req.body)
    // Convert everything to lower case
    // The removeDiacritics funtion bypasses some characters (åäöüÅÄÖÜ)
    // await new Promise(z => setTimeout(z, 277))
    let like = removeDiacritics (req.body.like)
    if (req.body.info != "exact") like = like.toLowerCase() // if not e.g. file name compare
      // console.log("like",like);
    let cols = eval ("[" + req.body.cols + "]")
    // Table columns:
    let taco = ["description", "creator", "source", "album", "name"]
    let columns = ""
    for (let i=0; i<cols.length; i++) {
      if (cols[i]) {columns += "||" + taco[i]}
    }
    columns = columns.slice (2)

    try { // Start try ----------
      if (like === '') {
        res.send ('')
      } else {
        // better-sqlite3:
        const db = new SQLite(IMDB + "/_imdb_images.sqlite")
        db.pragma("journal_mode = WAL") // Turn on write-ahead logging
        const rows = db.prepare('SELECT id, filepath, ' + columns + ' AS txtstr FROM imginfo WHERE ' + like).all()
        setTimeout(() => {
          var foundpaths = "", n = 0
            // console.log(rows)
          rows.forEach((row) => {
              // console.log("row.filepath",row.filepath.trim());
            // In certain situations, dotted directories may
            // appear here and urgently need to be left out!
            if (!row.filepath.includes('/.')) {
              foundpaths += row.filepath.trim() + "\n"
              n++
            }
          })
          console.log('Gross count found: ' + n) // Iincludes images from hidden albums etc.
          res.send(foundpaths.trim())
        }, 1000)
        db.close()
      }
    } catch (err) {
      console.error("€RR", err.message)
    } // End try ----------

      })

  // ##### Upload image(s)
  //region upload
  // ##### This must not be confused with the Multer upload which is, by now
  // deprecated, if not abandoned (associated with Dropzone, also abandoned)
  app.post('/upload', async (req, res) => {
    console.log(BGRE + '/upload' + RSET)
    try {
      var files = req.get('body')
        console.log(BLUE + files + RSET)
        // for (let f of files) {
        //   console.log(f)
        //   console.log(RED + f.name + ' ' + f.type + RSET)
        // }

      //files = files.split(LF)
      // for (i=0;i<files.length;i++) {
      //   files[i] = IMDB + IMDB_DIR + files[i]
      //     console.log(BYEL + files[i] + RSET)
      // }
      //res.send(files.join(LF))
    } catch (err) {
      console.error('Upload error', err.message)
    }
  })

  /*/ ##### Upload image(s)
  //region uploads
  app.post('/uploads', async (req, res) => {
    // res.location('/')
    // res.send('')
    res.end()
  })*/
 
  // app.post("/uploads", cpUpload, async function(req,res) {
  //   let return_token = req.body.return_token
  //   console.log(return_token)
  //   let file_that_was_uploaded = req.files
  //   console.log(file_that_was_uploaded)
  //   return res.json("thanks")
  // });




  // File upload route
  app.post('/uploads', async (req, res, next) => {
    console.log(BGRE + '/uploads' + RSET)
    upload(req, res, function(err) {
      if (err) {
        console.log(err.message)
        res.send(err.message)
        return
      }
      res.send('')
      console.log('hallåhallå')
      console.log(req.files)
      console.log('path:', req.files.path, 'size:', req.files.file[0].size)
      return
    })
    /*try {
      console.log('hallåhallå')
      console.log(req.files)
      console.log('path:', req.files.path, 'size:', req.files.file[0].size)
      let size = req.files.file[0].size
      await new Promise(z => setTimeout(z, size/1000))
      res.send('File uploaded!')
    } catch(err) {
      console.log(err.message)
      res.location('/')
      res.send(err.message)
    }*/
  })




  //#region FUNCTIONS






  // ===== Get the image databases' root directory
  // The server environment should have $IMDB_HOME, else use $HOME
  //#region imdbHome
  function imdbHome() {
    var IMDB_HOME = execSync('echo $IMDB_HOME').toString().trim()
    if (!IMDB_HOME || IMDB_HOME === '') {
      IMDB_HOME = execSync('echo $HOME').toString().trim()
    }
    return IMDB_HOME
  }

  // ===== Check and return image file condition, summarizing warning and error
  // counts calling 'finderrimg', which uses 'jpeginfo' and 'tiffinfo' (so far)
  //#region imgErr
  async function imgErr (file) {
    var extn = file.replace (/.*(\.[^. ]+)$/, "$1")
    if ( /\.jpe?g$/i.test (extn) ) {
      // return await cmdasync("finderrimg 1 " + file)
      return await exec("finderrimg 1 " + file)
    } else
    if ( /\.tiff?$/i.test (extn) ) {
      // return await cmdasync("finderrimg 2 " + file)
      return await exec("finderrimg 2 " + file)
    } else {
      return "NA"
    }
    // NOTE: An async function returns a Promise!
  }

  // ===== Check if a file is a symbolic link
  //#region isSymlink
  async function isSymlink(file) {
    // This precaution is taken for rare exceptions
    if (await notFile(file)) {
        // console.error('Illegal isSymlink call, file =', file)
      return
    }
    return new Promise(function(resolve, reject) {
      fs.lstat (file, function(err, stats) {
        if (err) {
          //console.error ('filestat isSymlink', err.message)
          resolve(false)
        } else {
          resolve(stats.isSymbolicLink())
        }
      })
    })
  }

  // ===== Check if a file does not exist
  //#region notFile
  async function notFile(path) {
    let cmd = '[ -f ' + path + ' ]; echo -n $?'
    return Number((await (exec(cmd))).stdout)
  }


  // ===== Read the dir's content of album sub-dirs(not recursively)
  //#region readSubdir
  const readSubdir = async (dir) => {
    var items = await readdir(dir) // items are file || dir names
    var files = []
      // console.log(dir, items)
    // try {
      for (let i=0;i<items.length;i++) {
        var name = items[i]
        var item = path.join(dir, name) // Relative path
        if (acceptedDirName(name) && !brokenLink(item)) {
          let stat = fs.statSync(item) // stat requires cb function
          if (stat.isDirectory()) {
            var flagFile = path.join(item, '.imdb')
            // console.log(i, name, item, acceptedDirName(name), !!brokenLink(item))
            try { // albums only
              await access(flagFile, fs.constants.F_OK)
              files.push(name)
              // console.log('   Accepted')
            } catch {
              // console.log('   Ignored')
            }
          }
        }
      }
      // console.log(dir, files)
      return files
    // } catch (err) {
    //   console.error("€ARG", err.message)
    //   return err.toString()
    // }
  }
    /*readSubdir = async (dir, files = []) => {
      return ProMise.map(items, async (name) => { // Cannot use mapSeries here(why?)
      //let apitem = path.resolve(dir, name) // Absolute path
      let item = path.join(dir, name) // Relative path
      if (acceptedDirName(name) && !brokenLink(item)) {
        let stat = await fs.stat(item)
        if (stat.isDirectory()) {
          let flagFile = path.join(item, '.imdb')
          let fd = await open(flagFile, 'r')
          if (fd > -1) {
            // fs.close(fd)
            fd.close()
            files.push(name)
          }
        }
      }
    })
    .then(files,() => {
      return files
    })
    .catch((err) => {
      console.error("€ARG", err.message)
      return err.toString()
    })
  } */

  // ===== Check if an album/directory name can be accepted
  //#region acceptedDirName
  function acceptedDirName(name) { // Note that – (&ndash;) and Üü are accepted:
    let acceptedName = 0 === name.replace(/[/\-–@_.a-zåäöüA-ZÅÄÖÜ0-9]+/g, '').length
    return acceptedName && name.slice(0,1) !== "." && !name.includes('/.')
  }

  // ===== Is this file/directory a broken link? Returns its name or false
  // NOTE: Broken links may cause severe problems if not taken care of properly!
  //#region brokenLink
  const brokenLink = item => {
    return execSync("find '" + item + "' -maxdepth 0 -xtype l 2>/dev/null").toString()
  }


  // ===== Read the IMDB's content of sub-dirs recursively
  // Use: allDirs().then(dirlist => { ...
  // IMDB is the absolute current album root path
  // Returns directories formatted like imdbDirs,(first "", then /... etc.)
  //region allDirs
  let allDirs = async () => {
    // let dirlist = await cmdasync('find -L ' + IMDB + ' -type d|sort')
    let dirlist = (await exec('find -L ' + IMDB + ' -type d|sort')).stdout
    dirlist = dirlist.toString().trim() // Formalise string
    dirlist = dirlist.split(LF)
    for (let i=0; i<dirlist.length; i++) {
      dirlist[i] = dirlist[i].slice(IMDB.length)
    }
      console.log('dirlist 0:', dirlist)
    return dirlist
  }

  // ===== Remove from a directory path array each entry not pointing
  // to an album, which contains a file named '.imdb', and return
  // the remaining album directory list. NOTE: Both returns(*) are required!
  //#region areAlbums
  let areAlbums = async (dirlist) => {
    let fd, albums = []
    return ProMise.mapSeries(dirlist, async (album) => { //(*) CAN use mapSeries here but don't understand why!?
      try {
        const fd = await open(IMDB + album + '/.imdb', 'r')
        // fs.close(fd)
        fd.close()
        // Exclude dotted, and not actual picFound files
        if (album.includes('/.') || album.includes('§') && album.indexOf(picFound) === -1) {
          // Ignore 'dotted' directory paths
          //console.log("NOT album:", album)
        } else {
          albums.push(album)
        }
      } catch(err) {
        // Ignore directories without '.imdb' file
        //console.log("NOT album:", album)
      }
    }).then(() => {
      return albums //(*)
    }).catch((err) => {
      console.error("€RRR", err.message)
      return err.toString()
    })
  }

  // ===== Read a directory's file content; also remove broken links
  //#region findFiles
  // async function findFiles
  const findFiles = async (dirName) => {
    // NOTE: Here we have to prove that 'dirName' exists, since it may be
    // the 'picFound' directory which is rather volatile (temporay, sometimes
    // cleaned away). If it occasionally doesn't exist, return '':
    try {
      await access(IMDB + dirName)
    } catch(err) {
      console.error(RED + 'Warning: Nonexistent album in findFiles: ' + RSET + dirName)
    }
    const items = await readdir(IMDB + dirName) // items are file || dir names
      // console.log('items:', items.length,items)
    let files = []
    // await new Promise(z => setTimeout(z, 5222)) // so log is written before catch
    try {
      for (let i=0;i<items.length;i++) {
          // await new Promise(z => setTimeout(z, 2222)) //log is written before catch
        var filepath = path.join(IMDB + dirName, items[i]) //refers to server (not web) root
        files[i] = filepath
          // console.log('filepath:', i, files[i])
        var brli = brokenLink(filepath)
        if (brli) {
          rmPic(filepath) // may hopefully also work for removing any single file ...
          files[i] = path.join(path.dirname(filepath), '.ignore') // fake dotted file
            // console.log('    >>>>', i, files[i])
        } else { // Check if this is a regular file:
          fs.stat(filepath, (err, stat) => {
            // if (stat.mode & 0o100000) {
            if (stat.mode & fs.constants.S_IFREG) {
              // See 'man 2 stat': S_IFREG bitmask for 'Regular file', and google more!
            } else {
              files[i] = path.join(path.dirname(filepath), '.ignore') // fake dotted file
                // console.log('    >>>>', i, files[i])
            }
          })
         /*let stat = fs.stat(filepath)
          if (stat.mode & 0o100000) {
            // See 'man 2 stat': S_IFREG bitmask for 'Regular file', and google more!
            files.push(filepath)
          } else {
            files.push(path.join(path.dirname(filepath), '.ignore')) // fake dotted file
          }*/
        }
      }
        // console.log('return:', files)
      return files
    } catch(err) {
      const tmp = IMDB_ROOT + dirName
      console.error(RED + 'Error in findFiles, dirName = "' + tmp + '"'+ RSET)
      // console.error(RED + 'Error in findFiles, filepath = "' + filepath + '"'+ RSET)
      console.log(RED + err.toString() + RSET)
      return ''
    }
    /*****************************old code***************************************
    return fs.readdirAsync(IMDB + dirName).map(function(fileName) { // Cannot use mapSeries here(why?)
        var filepath = path.join(IMDB + dirName, fileName)

      // console.log('filepath:', filepath)

      var brli = brokenLink(filepath) // refers to server root
      if (brli) {
        rmPic(filepath) // may hopefully also work for removing any single file ...
        return path.join(path.dirname(filepath), '.ignore') // fake dotted file
      }
      return fs.stat(filepath).then(function(stat) {
        if (stat.mode & 0o100000) {
          // See 'man 2 stat': S_IFREG bitmask for 'Regular file', and google more!
          return filepath
        } else {
          return path.join(path.dirname(filepath), ".ignore") // fake dotted file
        }
      })
    })
    .reduce(function(a, b) {
      //return a.concat(b)
      if (b) {a = a.concat(b)} // Discard undefined, from brokenLink check!
      return a
    }, [])
    .catch(err => {
      console.log("£RR", err.toString())
    })**********/
  }

  // ===== Make a package of orig, show, mini, and plain filenames, metadata, and symlink flag=origin
  //#region pkgfilenames
  async function pkgfilenames(origlist) {

          // console.log('PKGFILENAMES')
          // console.log('origlist: \n' + origlist)

    if (origlist) {
      let files = origlist.split('\n')

      // console.log('origlist:', files)

      allfiles = ''
      for (let file of files) {
        execSync('pentaxdebug ' + file) // Pentax metadata bug fix is done here
        let pkg = await pkgonefile(file)
        //console.log("pkg\n" + pkg)
        allfiles += '\n' + pkg
      }
      console.log('Showfiles•minifiles•metadata...')
      return allfiles.trim()
    } else {
      return ''
    }
  }
  async function pkgonefile(file) {

    // console.log('PKGONEFILE', file)

    let origfile = file
    let symlink = await symlinkFlag(origfile)
    let fileObj = path.parse(origfile)
    let namefile = fileObj.name
    if (namefile.length === 0) {return null}
    let showfile = path.join(fileObj.dir, '_show_' + namefile + '.png')
    let minifile = path.join(fileObj.dir, '_mini_' + namefile + '.png')
    if (symlink === '&') {
      resizefile(origfile, showfile, "'640x640>'")
      .then(resizefile(origfile, minifile, "'150x150>'")).then()
    } else {
      //let linkto = await cmdasync("readlink " + origfile).then().toString().trim() // NOTE: Buggy, links badly, why, wrong syntax?
      let linkto = execSync("readlink " + origfile).toString().trim()
      let linkObj = path.parse(linkto)

      // cmdasync("ln -sfn " + linkObj.dir + "/" +"_show_"+ linkObj.name + ".png " + showfile)
      exec("ln -sfn " + linkObj.dir + "/" +"_show_"+ linkObj.name + ".png " + showfile)
      // .then(cmdasync("ln -sfn " + linkObj.dir + "/" +"_mini_"+ linkObj.name + ".png " + minifile))
      .then(exec("ln -sfn " + linkObj.dir + "/" +"_mini_"+ linkObj.name + ".png " + minifile))
      .then()
    }
    let cmd = []
    let tmp = '--' // Should never show up
    // Extract Xmp data with exiv2 scripts to \n-separated lines
    cmd[0] = 'xmp_description ' + origfile // for txt1
    cmd[1] = 'xmp_creator ' + origfile     // for txt2
    // START HERE if you want to add, for example, xmp.dc.source = "notes text", and so on.
    // BUT REMEMBER, if so, to extend for this everywhere, after "res.send *" in "get * imagelist"
    let txt12 = ''
    for (let _i = 0; _i< cmd.length; _i++) {
      tmp = "?" // Should never show up
      //tmp = execSync(cmd[_i])
      // tmp = await cmdasync(cmd[_i])
      tmp = (await exec(cmd[_i])).stdout
      tmp = tmp.toString().trim() // Formalise string
      if (tmp.length === 0) tmp = "-" // Insert fill character
      tmp = tmp.replace(/\n/g," ").trim() // Remove embedded \n(s)
      if (tmp.length === 0) tmp = "-" // Insert fill character
      txt12 = txt12 +'\n'+ tmp
    }
    // Triggers browser autorefresh but no meaning to refresh symlinks:
    let qrn = '?' + Math.random().toString(36).substring(2,6)
    if (symlink !== '&') {qrn = ''}
    // origfile without root-link-name, nov 2014, e.g. imdb/aa/bb => aa/bb :
    // origfile without the whole IMDB-path, jan 2022:
    return(origfile.slice(IMDB.length) +'\n'+ showfile + qrn +'\n'+ minifile + qrn +'\n'+ namefile +'\n'+ txt12.trim()).trim() +'\n'+ symlink // NOTE: returns 7 rows, the last often '&'
  }

  // ===== Create minifile or showfile (note: size!), if non-existing
  // origpath = the file to be resized, filepath = the resized file
  //#region resizefile
  async function resizefile(origpath, filepath, size) {
    // Check if the file exists, then continue, but note (!): This open will
    // fail if filepath is absolute. Needs web-rel-path to work ...
    open(filepath, 'r').then(async (fd) => { // async!
      if (Number(fs.statSync(filepath).mtime) < Number(fs.statSync(origpath).mtime)) {
        await rzFile(origpath, filepath, size) // await!
      }
      fd.close() // Don't leave open!
    })
    .catch(async function(error) { // async!
      // Else if it doesn't exist, make the resized file:
      if (error.code === "ENOENT") {
        await rzFile(origpath, filepath, size) // await!
      } else {
        console.error('resizefile', error.message)
        throw error
      }
    })
  }

  // ===== Use of ImageMagick: It is no longer true that
  // '-thumbnail' stands for '-resize -strip', perhaps darkens pictures ...
  // Note: All files except GIFs are resized into JPGs and thereafter
  // 'fake typed' PNG (resize into PNG is too difficult with ImageMagick).
  // GIFs are resized into GIFs to preserve their special properties.
  // The formal file extension PNG will still be kept for all resized files.
  //#region rzFile
  async function rzFile(origpath, filepath, size) {
    var filepath1 = filepath // Set 'png' as in filepath
    if (origpath.search(/gif$/i) > 0) {
      filepath1 = filepath.replace(/png$/i, 'gif') // gif to gif
    } else {
      filepath1 = filepath.replace(/png$/i, 'jpg') // Others to jpg
    }
    var imckcmd
    imckcmd = "convert " + origpath + " -antialias -quality 80 -resize " + size + " -strip " + filepath1
      // console.log('imckcmd', imckcmd)

    // NEW EXEC WITH util.promisify
    var errmsg = await exec(imckcmd)
    // We have to be careful here since stderr may contain various messages and warnings
    // regarding irregular metadata field tags, especially among tiff image files, ignore;
    // if (errmsg.stdout || errmsg.stderr) {
    if (errmsg.stdout) {
      console.error('Imagemagick convert error:', errmsg)
      // this return may prohibit PNG typing, thus remove:
      //return
    }
    if(filepath1 !== filepath) {
      // execSync("mv " + filepath1 + " " + filepath + "&&chmod 664 " + filepath)
      await exec("mv " + filepath1 + " " + filepath + "&&chmod 664 " + filepath)
    }

    // // OLD EXEC
    // exec(imckcmd,(error, stdout, stderr) => {
    //   if (error) {
    //     console.error(`exec error: ${error}`)
    //     return
    //   }
    //   //if(filepath1 !== filepath) {
    //     try { // Rename to 'fake png' and adjust mode
    //       execSync("mv " + filepath1 + " " + filepath + "&&chmod 664 " + filepath)
    //     } catch(err) {
    //       console.error(err.message)
    //     }
    //   //}
      console.log(' .' + filepath.slice(IMDB.length) + ' created') // Hide absolute server path
    // })
    return
  }

  // ===== Check if an image/file name can be accepted
  //#region acceptedFileName
  function acceptedFileName(name) {
    // This function must equal the acceptedFileName function in common-storage.js
    var acceptedName = 0 === name.replace(/[-_.a-zA-Z0-9]+/g, "").length
    // Allowed file types are also set at drop-zone in the template menu-buttons.hbs
    var ftype = name.match(/\.(jpe?g|tif{1,2}|png|gif)$/i)
    var imtype = name.slice(0, 6) // System file prefix
    // Here more files may be filtered out depending on o/s needs etc.:
    return acceptedName && ftype && imtype !== '_mini_' && imtype !== '_show_' && imtype !== '_imdb_' && name.slice(0,1) !== "."
  }

  // ===== Remove the files of a picture, filename with full web path
  //      (or deletes at least the primarily named file)
  //#region rmPic
  function rmPic(fileName) {
    let picfile = path.parse(fileName).base
    let pngname = path.parse(fileName).name + '.png'
    let imdbImdbDir = path.parse(fileName).dir
    let IMDB_PATH = (IMDB + IMDB_DIR)
    let tmp = 'Directory mismatch when "' + fileName.slice(IMDB.length) + '" is deleted'
    if (imdbImdbDir !== IMDB_PATH) console.log('INFO: ' + RED + tmp + RSET)
    fs.unlink(imdbImdbDir + '/' + picfile) // File not found isn't caught!
    .then(sqlUpdate(fileName))
    .then(fs.unlink(imdbImdbDir +'/_mini_'+ pngname)) // File not found isn't caught!
    .then(fs.unlink(imdbImdbDir +'/_show_'+ pngname)) // File not found isn't caught!
    .then()
    .catch(function(error) {
      if (error.code === "ENOENT") {
        tmp = 'FILE NOT FOUND by ' + IMDB_ROOT + IMDB_DIR + '/' + picfile
      } else {
        tmp = 'NO PERMISSION to ' + IMDB_ROOT + IMDB_DIR + '/' + picfile
        console.error(tmp)
        return tmp
      }
    })
    return 'DELETED'
  }

  // ===== Return a symlink flag value, value = & or source file
  //#region symlinkFlag
  async function symlinkFlag (file) {
    // This precaution is taken for rare exceptions
    if (await notFile(file)) {
        // console.error('Illegal symlinkFlag call, file =', file)
      return
    }
    return new Promise(function (resolve, reject) {
      fs.lstat (file, function (err, stats) {
        if (err) {
          console.error ('symlinkFlag', err.message)
        } else if (stats.isSymbolicLink ()) {
          resolve (execSync("readlink " + file).toString ().trim ())
        } else {
          resolve ('&') // normal file
        }
      })
    })
  }

  // ===== Check and add|remove|update an image file record in the database
  // Se vidare filestat -- get file information  etc.
  // och search -- search text  etc.
  // Funkar ej om 'filepaths' är mer än en fil ... (async hell)
  // NOTE: filepaths.length MUST be 1 only, caused by sync/async problem!
  // That is, filepaths must have only one (hypothetically LF-separated) row
  // (designed for many but never fulfilled successfully with more than one)
  //#region sqlUpdate
  function sqlUpdate(filepaths) { // Album server paths, complete Absolute
    return new Promise(async function(resolve, reject) {
      let pathlist = filepaths.trim().split(LF)
      for (let i=0; i<pathlist.length; i++) { // forLoop
        let filePath = '.' + pathlist[i].slice(IMDB.length) // Album relative path
          // console.error(filePath)
        // No files in the picFound album (may be occasionally uploaded,
        // temporary non-symlinks) and no symlinks should be processed:
        if (filePath.indexOf(picFound) > 0 || await isSymlink(pathlist[i])) continue;
        // Classify the file as existing or not
        let pathArr = filePath.split("/")
        let xmpParams = [], dbValues = {}
        let fileExists = false
        try {
          let fd = fs.openSync(pathlist[i], 'r+') // Complete server path
          if (fd) {
            fileExists = true
            fs.closeSync(fd)
          }
        } catch (err) {
          fileExists = false
        }
        const db = new SQLite(IMDB + "/_imdb_images.sqlite")
        db.pragma("journal_mode = WAL") // Turn on write-ahead logging
        let sqlGetId = "SELECT id FROM imginfo WHERE filepath='" + filePath + "'"
        row = db.prepare(sqlGetId).get()
        //row = await db.get(sqlGetId)
        let recId = -1
        if (row) {recId = row['id']}

        // Get metadata from the picture, 'lowercased':
        function getSqlParams() {
          let xmpkey = ['description', 'creator', 'source']
          for (let j=0; j<xmpkey.length; j++) {
            // Important NOTE: this loop must correspond in both routes.js and ld_imdb.js
            let cmd = 'xmpget ' + xmpkey[j] + ' ' + pathlist[i]
              // console.log(RED + cmd + RSET)
            // The removeDiacritics function does bypass some characters: Swedish åäöÅÄÖ and German äöüÄÖÜ (not further customized to any individual language)
            // Remove diacritics and make lowercase. Remove tags and double spaces.
            xmpParams[j] = removeDiacritics(execSync(cmd).toString()).toLowerCase()
            xmpParams[j] = xmpParams[j].replace(/<[^>]+>/gm, "").replace(/  */gm, " ")
          }
          dbValues =   // Removed the $ prefix to fit better-sqlite3
          { filepath: filePath,
            name:     pathArr[pathArr.length - 1].replace(/\.[^.]+$/, ""), // Remove extension
            album:    removeDiacritics(filePath.replace(/^[^/]*(\/(.*\/)*)[^/]+$/, "$1")).toLowerCase(),
            description: xmpParams[0].trim(),
            creator:  xmpParams[1].trim(),
            source:   xmpParams[2].trim(),
            subject:  '',
            tcreated: '',
            tchanged: ''
          }
        }
        //console.log(" fileExists", fileExists, "recId", recId, i);

        if (recId > -1) { // in db table
          // RECORD 1 means that the database HAS a record
          // EXISTS 0 means that the image file does NOT exist
          // and the other way round ...

          if (fileExists) {
            /* RECORD 1  EXISTS 1
            ¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤ */
            //console.log(' sql UPDATE', recId, filePath)
            // update the table row where id = recId
            getSqlParams()
            // For better-sqlite3
            db.prepare("UPDATE imginfo SET (filepath,name,album,description,creator,source,subject,tcreated,tchanged) = ($filepath,$name,$album,$description,$creator,$source,$subject,$tcreated,$tchanged) WHERE id=" + recId).run(dbValues)
            //await db.run ('UPDATE imginfo SET (filepath,name,album,description,creator,source,subject,tcreated,tchanged) = ($filepath,$name,$album,$description,$creator,$source,$subject,$tcreated,$tchanged) WHERE id=' + recId, values = dbValues)

          } else {
            /* RECORD 1  EXISTS 0
            ¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤ */
            //console.log(' sql DELETE', recId, filePath)
            db.prepare("DELETE FROM imginfo WHERE id=" + recId).run()
            //let sqlDelete = "DELETE FROM imginfo WHERE id=" + recId
            //await db.run(sqlDelete)
          }

        } else { // not in db table

          if (fileExists) {
            /* RECORD 0  EXISTS 1
            ¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤ */
            //console.log(' sql INSERT', filePath)
            // insert a table row with filepath = filePath
            getSqlParams()
            db.prepare("INSERT INTO imginfo (filepath,name,album,description,creator,source,subject,tcreated,tchanged) VALUES ($filepath,$name,$album,$description,$creator,$source,$subject,$tcreated,$tchanged)").run(dbValues)
            //await db.run ('INSERT INTO imginfo (filepath,name,album,description,creator,source,subject,tcreated,tchanged) VALUES ($filepath,$name,$album,$description,$creator,$source,$subject,$tcreated,$tchanged)', values = dbValues)

          } else {
            /* RECORD 0  EXISTS 0
            ¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤ */
            //console.log(' sql NOOP', filePath)
            // do nothing
          } //--if else
        } //--if else
        await new Promise(z => setTimeout(z, 222))
        db.close()
      } //--for loop
      resolve(true)
    }) //--Promise
  }

} // End module.exports

//GLOBALS Globals globals
//#region DIACRITICS
// Data for the removeDiacritics function (see below), modified to not affect
// some characters (see the script ld_imdb.js, this must be identical):
const defaultDiacriticsRemovalMap = [
  {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u01DE\u1EA2\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'}, // removed Ä \u00C4, Å \u00C5
  {'base':'AA','letters':'\uA732'},
  {'base':'AE','letters':'\u00C6\u01FC\u01E2'},
  {'base':'AO','letters':'\uA734'},
  {'base':'AU','letters':'\uA736'},
  {'base':'AV','letters':'\uA738\uA73A'},
  {'base':'AY','letters':'\uA73C'},
  {'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
  {'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
  {'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0'},
  {'base':'DZ','letters':'\u01F1\u01C4'},
  {'base':'Dz','letters':'\u01F2\u01C5'},
  {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
  {'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
  {'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
  {'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
  {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
  {'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
  {'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
  {'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
  {'base':'LJ','letters':'\u01C7'},
  {'base':'Lj','letters':'\u01C8'},
  {'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
  {'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
  {'base':'NJ','letters':'\u01CA'},
  {'base':'Nj','letters':'\u01CB'},
  {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'}, // removed Ö \u00D6
  {'base':'OI','letters':'\u01A2'},
  {'base':'OO','letters':'\uA74E'},
  {'base':'OU','letters':'\u0222'},
  {'base':'OE','letters':'\u008C\u0152'},
  {'base':'oe','letters':'\u009C\u0153'},
  {'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
  {'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
  {'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
  {'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
  {'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
  {'base':'TZ','letters':'\uA728'},
  {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'}, // removed Ü \u00DC
  {'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
  {'base':'VY','letters':'\uA760'},
  {'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
  {'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
  {'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
  {'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
  {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u01DF\u1EA3\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'}, // removed ä \u00E4, å \u00E5
  {'base':'aa','letters':'\uA733'},
  {'base':'ae','letters':'\u00E6\u01FD\u01E3'},
  {'base':'ao','letters':'\uA735'},
  {'base':'au','letters':'\uA737'},
  {'base':'av','letters':'\uA739\uA73B'},
  {'base':'ay','letters':'\uA73D'},
  {'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
  {'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
  {'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
  {'base':'dz','letters':'\u01F3\u01C6'},
  {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
  {'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
  {'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
  {'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
  {'base':'hv','letters':'\u0195'},
  {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
  {'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
  {'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
  {'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
  {'base':'lj','letters':'\u01C9'},
  {'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
  {'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
  {'base':'nj','letters':'\u01CC'},
  {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'}, // removed ö \u00F6
  {'base':'oi','letters':'\u01A3'},
  {'base':'ou','letters':'\u0223'},
  {'base':'oo','letters':'\uA74F'},
  {'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
  {'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
  {'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
  {'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
  {'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
  {'base':'tz','letters':'\uA729'},
  {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'}, // removed ü \u00FC
  {'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
  {'base':'vy','letters':'\uA761'},
  {'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
  {'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
  {'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
  {'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
];
let diacriticsMap = {};
for (let i=0; i < defaultDiacriticsRemovalMap.length; i++){
  let letters = defaultDiacriticsRemovalMap[i].letters;
  for (let j=0; j < letters.length ; j++){
    diacriticsMap[letters[j]] = defaultDiacriticsRemovalMap[i].base;
  }
}
function removeDiacritics(str) {
  return str.replace(/[^\u0000-\u007E]/g, function(a) {
    return diacriticsMap[a] || a;
  });
}

//#region NOT USED
// THIS FUNCTION IS NEVER USED
/** Function that counts occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The substring to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
//#region occurences
function occurrences(string, subString, allowOverlapping) {
  string += "";
  subString += "";
  if (subString.length <= 0) return(string.length + 1);

  var n = 0,
    pos = 0,
    step = allowOverlapping ? 1 : subString.length;

  while (true) {
    pos = string.indexOf(subString, pos);
    if (pos >= 0) {
      ++n;
      pos += step;
    } else break;
  }
//console.log(subString, n);
  return n;
}

