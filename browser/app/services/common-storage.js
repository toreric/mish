//== Mish common storage service with global properties/methods

import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';

// import { replace } from 'tar';
// import { query } from 'express';
import he from 'he';
// USE: <div title={{he.decode 'text'}}></div> ['he' = HTML entities]
// or  txt = he.decode('text')  or  txt = he.encode('text')

const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break
const BGRE = '\x1b[1;32m'; // Bright green
const BYEL = '\x1b[1;33m'; // Bright yellow
const RED  = '\x1b[31m';   // Red
const RSET = '\x1b[0m';    // Reset

export default class CommonStorageService extends Service {
  @service intl;

  //   #region VARIABLES
  //== Significant Mish system global variables

  @tracked  aboutThis = '«Mish»'; //info (to be changed) about Mish build version etc.
  @tracked  albumHistory = [0];   //album index visit history
  @tracked  allFiles = [];     // Image file information objects, changes with 'imdbDir'
  @tracked  bkgrColor = '#111';   //default background color
  @tracked  credentials = '';     //user credentials: \n-string from db
  @tracked  freeUsers = 'guest...'; //user names without passwords (set by DialogLogin)
  @tracked  imdbCoco = '';    //content counters etc. for 'imdbDirs', see (*) below
  @tracked  imdbDir = '';     //actual/current (sub)album directory (IMDB_DIR)
  @tracked  imdbDirIndex = 0; //actual/current (sub)album directory index
        get imdbDirName() {   //the last-in-path album name of 'imdbRoot+imdbDir'
              if (this.imdbRoot) {
                return (this.imdbRoot + this.imdbDir).replace(/^(.*\/)*([^/]+)$/, '$2');
              } else {
                return '';
              }
            }
  @tracked  imdbDirs = [''];        //all available album paths at imdbRoot
  @tracked  imdbLabels = [''];      //thumbnail labels for 'imdbDirs' (paths to)
        get imdbPath() { // userDir/imdbRoot = absolut path to album root
              return this.userDir + '/' + this.imdbRoot;
            }
  @tracked  imdbRoot = '';          //chosen album root directory (= collection)
  @tracked  imdbRoots = null; //[this.imdbRootsPrep]; //available album root directories
        get imdbRootsPrep() { return this.intl.t('reloadApp'); } // advice!
  @tracked  imdbTree = null;                  //will have the 'imdbDirs' object tree
  @tracked  infoHeader = 'Header text';       //for DialogAlert and DialogChoose
  @tracked  infoMessage = 'No information';   //for dialog texts (e.g. DialogAlert)
  @tracked  intlCodeCurr = null; //this.intlCode;     // language code
        get intlCode() { return this.intl.t('intlcode'); }
        // The found pics temporary directory name is amended with a random 4-code at login:
  @tracked  RID = '----';
  @tracked  picFound = null; //this.picFoundBaseName + '.' + this.RID;
        get picFoundBaseName() { return this.intl.t('picfound'); }
  @tracked  picFoundIndex = -1; //set in MenuMain, the index may vary by language
  @tracked  picName = ''; //actual/current image name
            picIndex = async () => { //the index of picName's file info.object in allFiles
              while (!this.allFiles.findIndex) await new Promise (z => setTimeout (z,99));
              let index = this.allFiles.findIndex(a => {return a.name === this.picName;});
              return index;
            }
  @tracked  sortOrder = '';    //file order information table of 'imdbDir'
  @tracked  subColor = '#aef'; //subalbum legends color
        get subaIndex() {      //subalbum index array for imdbLabels
              let subindex = [];
              for (let i=this.imdbDirIndex+1;i<this.imdbDirs.length;i++) {
                if (this.imdbDirs[i] && (this.imdbDirs[i] + '/').startsWith(this.imdbDir + '/')) {
                  if (this.imdbDirs[i].slice(this.imdbDir.length + 1).split('/').length === 1) {
                    subindex.push(i);
                  }
                }
              }
              return subindex;
            }
  @tracked  textColor = '#fff'; //default text color
  //        Maybe your home dir., server start argument IMDB_HOME:
  @tracked  userDir = '/path/to/albums';
  //        userName may be changed in other ways later (e.g. logins):
  @tracked  userName = null; //this.defaultUserName;
        get defaultUserName() { return this.intl.t('guest'); }
  @tracked  userStatus = ''; // A logged in user has a certain allowance status
  @tracked  wwwDir = '/path/to/www';

  // (*) imdbCoco format is "(<npics>[+<nlinked>]) [<nsubdirs>] [<flag>]"
  // where <npics> = images, <nlinks> = linked images, <nsubdirs> = subalbums,
  // and <flag> is empty or "*". The <flag> indicates a hidden album,
  // which needs permission for access

  initialize = async () => { // Called from routes/application.js
    // idempotent: safe to call multiple times, but should be called ONCE
    if (this.imdbRoots === null) this.imdbRoots = this.imdbRootsPrep;
    if (this.intlCodeCurr === null) this.intlCodeCurr = this.intlCode;
    if (this.picFound === null) this.picFound = this.picFoundBaseName + '.' + this.RID;
    if (this.userName === null) this.userName = this.defaultUserName;
  }

  //   #region VIEW VARS
  //== Miniature and show images etc. information

  @tracked  albumTools = undefined; // For DialogUtil choice (tools for the album or common)
  @tracked  chooseText = ' Choose what?'; // Choice text
  @tracked  displayNames = 'none'; // Image name display switch
  @tracked  edgeImage = '';  // Text indicating first/last image
  @tracked  hasImages = false; // true if 'imdbDir' has at least one image
  // 'maxWarning' is set in Welcome (about 100?), more will trigger a warning:
  @tracked  maxWarning = 0;  // Recommended max. number of images in an album
  // Dynamic album information:
  @tracked  numHidden = 0;  // Number of images with hide flag in 'sortOrder'
  @tracked  numImages = 0;  // Total numder of images in the album
  @tracked  numInvisible = 0; // Number of invisible images
  @tracked  numLinked = 0;    // Number of images linked into the album
  @tracked  numMarked = 0;  // Number of selection marked images
  @tracked  numOrigin = 0;  // Numder of own original images in the album
  @tracked  numShown = 0;   // Not further explained

  @tracked  refreshTexts = 0; // Refresh trigger for RefreshThis
  @tracked  refreshTree = 0; // Refresh trigger for RefreshThis

  // For the DialogChoose dialog component, where
  // generally 0=no, 1=ok, and 2=cancel button selected
  @tracked buttonNumber = 0;
  selectChoice = (nr) => {
    this.buttonNumber = nr;
  }

  //   #region ALOWANCE
  //== Allowances variables/properties/methods

  @tracked allow = {}; // The allow object is defined by allowFunc()

  // Rights text table retreived from _imdb_settings.sqlite datbase and
  // initially assembled by the server on demand from the login dialog
  @tracked allowances = '';

  @tracked allowance = [  // defines the order of 'allow'
                    //
    "adminAll",     // + allow EVERYTHING
    "albumEdit",    // +  " create/delete album directories
    "appendixEdit", // o  " edit appendices (attached documents)
    "appendixView", // o  " view     "
    "delcreLink",   // +  " delete and create linked images NOTE *
    "deleteImg",    // +  " delete (= remove, erase) images NOTE *
    "imgEdit",      // o  " edit images
    "imgHidden",    // +  " view and manage hidden images
    "imgOriginal",  // +  " view and download full size images
    "imgReorder",   // +  " reorder images
    "imgUpload",    // +  " upload    "
    "notesEdit",    // +  " edit notes (metadata) NOTE *
    "notesView",    // +  " view   "              NOTE *
    "saveChanges",  // +  " save order/changes (= saveOrder)
    "setSetting",   // +  " change settings
    "textEdit"      // +  " edit image texts (metadata) and hidden albums
                    //
                    // o = not yet used
  ];

  // allowvalue is the source of the 'allow' property values, reset at login
  @tracked allowvalue = "0".repeat(this.allowance.length);

  get allowText() { return [  // IMPORTANT: Ordered as 'allow'!
    `adminAll:     ${this.intl.t('adminAll')}`,
    `albumEdit:    ${this.intl.t('albumEdit')}`,
    `appendixEdit: ${this.intl.t('appendixEdit')}`,
    `appendixView: ${this.intl.t('appendixView')}`,
    `delcreLink:   ${this.intl.t('delcreLink')}`,
    `deleteImg:    ${this.intl.t('deleteImg')}`,
    `imgEdit:      ${this.intl.t('imgEdit')}`,
    `imgHidden:    ${this.intl.t('imgHidden')}`,
    `imgOriginal:  ${this.intl.t('imgOriginal')}`,
    `imgReorder:   ${this.intl.t('imgReorder')}`,
    `imgUpload:    ${this.intl.t('imgUpload')}`,
    `notesEdit:    ${this.intl.t('notesEdit')}`,
    `notesView:    ${this.intl.t('notesView')}`,
    `saveChanges:  ${this.intl.t('saveChanges')}`,
    `setSetting:   ${this.intl.t('setSetting')}`,
    `textEdit:     ${this.intl.t('textEdit')}`
  ];}

  allowFunc = () => { // Called from Welcome and dialogLogin after login
    let allow = this.allow;
    let allowance = this.allowance;
    let allowvalue = this.allowvalue;
    for (let i=0; i<allowance.length; i++) {
      allow[allowance[i]] = Number(allowvalue[i]);
    }
    if (allow.adminAll) {
      allowvalue = "1".repeat(this.allowance.length);
      for (let i=0; i<allowance.length; i++) {
        allow[allowance[i]] = 1;
      }
    }
    if (allow.deleteImg) {  // NOTE *  If ...
      allow.delcreLink = 1; // NOTE *  then set this too
      let i = allowance.indexOf("delcreLink");
      // Also set the source value (in this way since allowvalue[i] = "1" isn't allowed: compiler error: "4 is read-only" if 4 = the index value)
      allowvalue = allowvalue.slice(0, i - allowvalue.length) + "1" + allowvalue.slice(i + 1 - allowvalue.length);
    }
    if (allow.notesEdit) { // NOTE *  If ...
      allow.notesView = 1; // NOTE *  then set this too
      let i = allowance.indexOf("notesView");
      allowvalue = allowvalue.slice(0, i - allowvalue.length) + "1" + allowvalue.slice(i + 1 - allowvalue.length);
    }
    // Hide smallbuttons we don't need:
    if (allow.saveChanges) {
      document.getElementById('saveOrder').style.display = '';
    } else { // Any user may reorder but not save
      document.getElementById('saveOrder').style.display = 'none';
    }
    if (!this.imdbRoot) document.getElementById('smallButtons1').style.display = 'none';

    this.allow = allow;
    this.allowance = allowance;
    this.allowvalue = allowvalue;
  }

  //   #region TEXT UTILS
  //== Text utility functions

  // Check if an album/directory name can be accepted
  // WHAT ABOUT THE ORDINARY SLASH? (/)
  acceptedDirName = (name) => { // Note that – (&ndash;) and Üü are accepted:
    let acceptedName = 0 === name.replace(/[/\-–@_.a-zåäöüA-ZÅÄÖÜ0-9]+/g, '').length;
    return acceptedName && name.slice(0,1) !== "." && !name.includes('/.');
  }

  // Check if an image file name can be accepted
  acceptedFileName = (name) => {
    // This function must equal the acceptedFileName server function
    let acceptedName = 0 === name.replace(/[-_.a-zA-Z0-9]+/g, "").length;
    let ftype = name.match(/\.(jpe?g|tif{1,2}|png|gif)$/i);
    let imtype = name.slice(0, 6); // System file prefix
    // Here more files may be filtered out depending on o/s needs etc.:
    return acceptedName && ftype && imtype !== '_mini_' && imtype !== '_show_' && imtype !== '_imdb_' && name.slice(0,1) !== ".";
  }

  // Place a four character random 'intrusion' within a file name
  // Like 'filename.09av.jpg', cf. below!
  addRandom = (fname) => {
    // n1 = image (file) name, n2 = file extension
    // dr4 = a dot and four random characters from [0-9a-v], e.g. '.09av'
    let n1 = fname.replace(/(^.*)(\.[^.]+$)/, '$1');
    let n2 = fname.replace(/(^.*)(\.[^.]+$)/, '$2');
    let dr4 = Math.random().toString(36).slice(1,6);
    return n1 + dr4 + n2;
  }

  // Replace <br> with \n, used in dialog-text/DialogText
  deNormalize2LF = (str) =>{
    return str.replace(/<br>/g, LF);
  }

  // Neutralize dots for CSS, e.g. in the querySelector() argument
  escapeDots = (textString) => { // Cf. CSS.escape()
    // Used for file names when used in CSS, #<id> etc.
    // await new Promise (z => setTimeout (z,99));
    return textString.replace (/\./g, "\\.");
  }

  // Susbtitute underscores in an album name with spaces and remove the first
  // character and the random end from a temporary 'found-images-album' name
  handsomize2sp = (name) => {
      // this.z.loli('name = ' + name, 'color:yellow');
      // console.log('name = ' + name)
    let tmp = name.replace(/_/g, ' ');
    if (tmp[0] === '§') tmp = tmp.replace(/\.[^.]+$/, '').slice(1);
    return tmp;
  }

  // Replace \n with <br> and remove excess spaces
  // Used in saveDialog('dialogText'), cf. deNormalize2LF
  normalize2br = (str, leaveEnd) => {
    if (leaveEnd) {
      str = str.trimStart();
    } else {
      str = str.trim();
    }
    return str.replace(/\n +/g, LF).replace(/\n/g, ' <br>').replace(/ +/g, ' ');
  }

  // Remove HTML tags from text and decode HTML entities
  noTags = (txt) => {
    let tmp = txt.toString().replace(/<(?:.|\n)*?>/gm, ""); // Remove <tags>
    tmp = he.decode(tmp); // for HTML entities
    tmp = tmp ? tmp : ' ';
    return tmp;
  }

  // Remove HTML tags from the text and shorten to fit thumbnails
  noTagsShort = (txt) => {
    let tmp = txt.toString().replace(/<(?:.|\n)*?>/gm, ""); // Remove <tags>
    return tmp.slice(0, 23) ? tmp.slice(0, 23) : '&nbsp;';
  }

  // Replace underscores with ' ' or '&nbsp;'
  removeUnderscore = (textString, noHTML) => {
    return textString.replace (/_/g, noHTML ? ' ' : '&nbsp;');
  }


  //   #region UTILITIES
  //== Other utilities and service functions






  // Alert a not yet implemented facility (intl.text)
  //#region futureNotYet
  futureNotYet = (facility) => {
    let alrt = document.getElementById('dialogAlert');
    if (alrt.open) {
      alrt.close();
    } else {
      this.alertMess('<div style="text-align:center">' + this.intl.t(facility) + ':' + BR + BR + this.intl.t('futureFacility') + '</div>');
    }
  }

  // Disable browser back arrow, go instead to most recent visited album
  //#region initBrowser
  initBrowser = async () => {
    // Refresh the setting, it may have been lost!
    while (this.bkgrColor) { // Intended eternal loop
      window.history.pushState (null, "");
      window.onpopstate = () => {
        this.goBack();
      }
      await new Promise (z => setTimeout (z, 10000)); // eternal loop pause
    }
  }

  // Browswer back arrow
  //#region goBack
  goBack = () => {
    if (!this.imdbRoot) return;
    this.albumHistory.pop();
    let index = this.albumHistory.length - 1;
    // if (index < 1) { // Reset even at 0=root, may prohibit "browser disorder"
    if (index < 0) {
      this.albumHistory = [0];
      return;
    }
    index = this.albumHistory[index];
    if (this.albumHistory.length > 1) this.albumHistory.pop();
    this.openAlbum(index);
  }

  //#region homeAlbum
  homeAlbum = async (path, picName) => { // was parAlb
      // this.loli('path:' + path + ':');
      // this.loli('picName: ' + picName, 'color:red');
    // Convert the relative path of the linked-file target,
    // to conform with z.imdbDirs server list, rooted at album root
    if (this.imdbDir.slice(1,2) === '§') picName = (picName.trim()).replace(/\.[0-9a-z]{4}$/, '');
      // this.loli('imdbDir: ' + this.imdbDir, 'color:orange');
      this.loli('picName: ' + picName, 'color:orange');
      this.loli('path: ' + path, 'color:orange');
    let dir = path.replace(/^([.]*\/)*/, '/').replace(/\/[^/]+$/, '');
    let name = path.replace(/^([^/]*\/)*([^/]+)\/[^/]+$/, "$2");
    // dir is the home album (with index i) for path
    let i = this.imdbDirs.indexOf(dir);
    if (i < 0) {
      if (document.getElementById('dialogAlert').open) {
        this.closeDialog('dialogAlert');
      } else {
        this.alertMess(this.intl.t('albumMissing') + ':<br><br><p style="width:100%;text-align:center;margin:0">”' + this.removeUnderscore(name) + '”</p>', 0);
      }
    } else {
      this.openAlbum(i);
      // Allow for the rendering of mini images and preload of view images
      let size = this.albumAllImg(i);
      await new Promise (z => setTimeout (z, size*120 + 100)); // album load
      this.gotoMinipic(picName);
    }
  }

  //#region openAlbum
  openAlbum = async (i) => {
    this.picName = '';
    // Close dialogs without reuse potential:
    // this.closeDialog('dialogAlert');
    this.closeDialog('dialogChoose');
    this.closeDialog('dialogInfo');
    this.closeDialog('dialogText');
    // this.closeDialog('dialogUtil'); // Tools
    // Close the show image view
    document.querySelector('.img_show').style.display = 'none'; //was 'table'
    // Open the thumbnail view
    document.querySelector('.miniImgs.imgs').style.display = 'flex';
    // Hide the right side buttons
    document.querySelector('.nav_links').style.display = 'none';
    // Show left buttons, language buttons, subalbums
    document.querySelector('#smallButtons1').style.display = '';
    document.querySelector('#upperButtons').style.display = '';
    document.querySelector('.albumsHdr').style.display = '';
    // Display the spinner
    document.querySelector('img.spinner').style.display = '';
    // Set marked zero
    this.numMarked = 0;

    i = Number(i); // important!
    //if (i === 0) this.albumHistory = [0]; // Recover from possible "browser disorder"
    this.imdbDir = this.imdbDirs[i];
    this.imdbDirIndex = i;
    let h = this.albumHistory;
    if (h.length > 0 && h[h.length - 1] !== i) this.albumHistory.push(i);
    let a = this.imdbRoot + this.imdbDir;
    document.getElementById('smallButtons1').style.display = '';
    this.loli('opened album ' + i + ' ' + a, 'color:lightgreen' );
    // Reset colors in the album tree of the main menu
    for (let tmp of document.querySelectorAll('span.album')) {
      tmp.style.color = '';
    }

    // Retreive information for every image file from the server:
    this.allFiles = [];
    this.allFiles = await this.getImages();
      // console.log(this.allFiles); // LOG WITH

    // Get the image order information from the server:
    this.sortOrder = await this.requestOrder();

    // Now arrange allFiles according to sortOrder before populating DOM
    let allFiles = [...this.allFiles]; // clone-copy
    let newFiles = [];
    let order = this.sortOrder.split(LF);
    let name, k;
        // this.loli(order);
    for (let ord of order) {
      name = ord.split(',')[0]
      k = allFiles.findIndex(all => {return all.name === name;});
          // this.loli(k + ' ' + name, 'color:red')
      if (k > -1) {
        newFiles.push(allFiles[k]);
        allFiles[k] = '';
      }
    }
    // The remaining (if any)
    for (let file of allFiles) {
      if (file) newFiles.push(file);
    }
    this.hasImages = newFiles.length > 0;
      // this.loli('hasImages = ' + this.hasImages, 'color:red'); // LOG WITH
    this.numImages = newFiles.length;
    this.allFiles = newFiles;

    this.clearMiniImgs(); // remove any old thumbnails
    // Hide the subalbums etc.
    document.querySelector('#upperButtons').style.display = 'none';
    document.querySelector('.albumsHdr').style.display = 'none';

    // Populate the DOM with mini images by using the hidden
    // load button in component(s) 'ViewMain > AllImages' to
    // "push the allFiles content" into the thumbnail template:
    document.getElementById('loadMiniImages').click();

    // Show the subalbums etc.
    document.querySelector('#upperButtons').style.display = '';
    document.querySelector('.albumsHdr').style.display = '';

    // Warn for too many images, if relevant
    if (this.allFiles.length > this.maxWarning && this.allow.imgUpload) {
      this.alertMess(this.intl.t('sizewarning') + ' ' + this.maxWarning + ' ' + this.intl.t('images') + '!', 6);
    }

    this.refreshTexts ++ // retrigger rendering, extra for some occasions

    // Allow for the rendering of mini images and preload of view images
    let size = this.albumAllImg(i);
    await new Promise (z => setTimeout (z, size*2)); // album load

    // Then hide the spinner
    document.querySelector('img.spinner').style.display = 'none';

    // Set classes and different background on hidden images
    await this.paintHideFlags(true);
    // Reset the show/hide button since hidden images are not shown initially
    this.hideHidden();

    // Prepare for an initial arrow key hit by setting
    // 'this.picName' to the last in album
    if (this.allFiles.length > 0) {
      this.picName = this.allFiles[this.allFiles.length - 1].name;
    } else this.picName = '';

    // Set colors in the album tree
    this.paintTree(i);
  }

  // Set colors in the album tree (isel = imdbDirIndex)
  //#region paintTree
  paintTree = (isel) => {
    // FIRST: Make 'secret albums' pink in the ALBUM tree of the main menu:
    for (let i=0;i<this.imdbCoco.length;i++) {
      if (this.imdbCoco[i].includes('*')) { // contains() is deprecated!
        document.querySelector('span.album.a' + i).style.color = 'pink';
      }
    }
    // THEN: Set color mark on picFound
    document.querySelector('span.album.a' + this.picFoundIndex).style.color = '#e0e';
    // THEN: Set color mark on the selected album name and make it visible
    // NOTE: This is the selected album in the ALBUM tree.
    document.querySelector('span.album.a' + isel).style.color = '#fd0';
    let selected = document.querySelector('div.album.a' + isel);
    selected.style.display = '';
    // Check that all parents are visible too
    while (selected.parentElement.classList.contains('album')) {
      selected = selected.parentElement;
      if (selected.nodeName !== 'DIV') break;
      selected.style.display = '';
    }
  }

  //#region setTreeMax
  // Set the maximum display height of the album tree
  setTreeMax = () => {
    let atree = document.querySelector('div.albumTree');
      // console.log('setTreeMax scrollY', window.scrollY);
      // console.log('setTreeMax innerHeight', window.innerHeight);
      // console.log('setTreeMax top', atree.getBoundingClientRect().top);
    let max = window.innerHeight - atree.getBoundingClientRect().top;
    if (max < 16) max =16;
      // console.log('setTreeMax max', max);
    atree.style.maxHeight = max + 'px';
  }

 //#region updateTree
  updateTree = async () => { // Album root = collection
    this.imdbDir = ''; // The root is assumed initially selected
    const allow = this.allow; // permissions

    // Display the spinner already (will be hidden somewhere else)
    document.querySelector('img.spinner').style.display = '';

    await new Promise (z => setTimeout (z, 799)); // selectRoot, ensurance!?
    // The await reason: Sometimes getAlbumDirs is unsuspectedly null
    // The await values history: 199, 399, 799

    // Retreive the albums list of this collection (root album).
    // If the argment is false, _imdb_ignore.txt in the chosen
    // root album is read by the server, and mentioned albums
    // with subalbums are removed from the list:
    let tmp = await this.getAlbumDirs(allow.textEdit);
    let arr = tmp.split(LF);
      // this.loli(arr[1], 'color:red');

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // The two first lines (to be shifted off) have other content
    arr.shift();
    arr.shift();
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

    let n = arr.length/3;
    this.imdbDirs = arr.splice(0, n); // album paths (without root)
    this.imdbCoco = arr.splice(0, n); // album content counts
    this.imdbLabels = arr.splice(0, n); // album labels (thumbnail paths)
      this.loli('imdbCoco ' + n + LF + this.imdbCoco.join(LF), 'color:yellow');
      this.loli('imdbDirs ' + n + LF + this.imdbDirs.join(LF), 'color:yellow');
      this.loli('imdbLabels ' + n + LF + this.imdbLabels.join(LF));
      this.loli(this.imdbDirs, 'color:green');

    // let data = structuredClone(this.imdbDirs); // alt. clone-copy
    let data = [...this.imdbDirs]; // clone-copy albums
    let root = this.imdbRoot;
    for (let i=0;i<data.length;i++) {
      data[i] = root + data[i]; // amend the root directory name
    }
        // this.loli('imdbRoot/imdbDirs ' + n + LF + data.join(LF));
        // this.loli(data);
        // this.loli(this.imdbDirs, 'color:red');

    //begin https://stackoverflow.com/questions/72006110/convert-file-path-into-object
    // Convert the album directory list 'data' to a JS tree. Modifications are:
    // m1. For directories only, file code is commented out.
    // m2. Properties added: index, coco, path, and label (coco = content count)
    // m3. Store the index of the directory 'picFound' in 'picFoundIndex'
    let i = 0;
    const tree = { root: {} }
    for (const path of data) {
      const parts = path.split('/');
      // const file = parts.pop(); // m1.
      let branch = tree, partPath = '';
      for (const part of parts) {
        partPath += `${part}/`;
        if (partPath === `${part}/`) {
          tree.root[partPath] = (tree[partPath] ??= { name: part, index: i++, coco: this.imdbCoco[i-1], path: partPath, label: this.imdbLabels[i-1], children: [] }); // m2.
        } else if (tree[partPath] === undefined) {
          tree[partPath] = { name: part, index: i++, coco: this.imdbCoco[i-1], path: partPath, label: this.imdbLabels[i-1], children: [] }; // m2.
          branch.children.push(tree[partPath]);
            // this.loli(part + ' ' + i, 'color:deeppink');
          if (part === this.picFound) this.picFoundIndex = i - 1; // m3.
        }
        branch = tree[partPath];
      }
      // branch.children.push({ name: file, id: path }); // m1.
    }
    const result = Object.values(tree.root);
    //end https://stackoverflow.com/questions/72006110/convert-file-path-into-object

      // console.log(result);
    this.imdbTree = result;
      // this.loli(this.imdbTree);
      // this.loli(this.imdbDirs);
      // this.loli('imdbTree ' + n + LF + JSON.stringify(result, null, 2)); //human readable
      // this.loli(this.imdbCoco.length, 'color:red');
    // await new Promise (z => setTimeout (z, 33*this.imdbCoco.length)); // selectRoot Wait for album tree
    this.refreshTree ++;
    await new Promise (z => setTimeout (z, 333)); // selectRoot Wait for album tree

    // Set colors in the album tree
    this.paintTree(this.imdbDirIndex);
    // this.loli(this.imdbDirs);
  }

  //#region toggleText
  toggleText = () => {
    if (document.getElementById('link_texts').style.display === 'none') document.getElementById('link_texts').style.display ='';
    else document.getElementById('link_texts').style.display ='none';
  }

  //#region toggleBackg
  toggleBackg = () => {
    if (this.bkgrColor === '#cbcbcb') {
      this.bkgrColor = '#111';
      this.textColor = '#fff';
      this.subColor = '#aef';
      this.setCookie('mish_bkgr', 'dark');
      document.querySelector('#dark_light').classList.remove('darkbkg');
      this.loli('set dark background');
    } else {
      this.bkgrColor = '#cbcbcb';
      this.textColor = '#111';
      this.subColor = '#146';
      this.setCookie('mish_bkgr', 'light');
      document.querySelector('#dark_light').classList.add('darkbkg');
      this.loli('set light background');
    }
    document.querySelector('body').style.background = this.bkgrColor;
    document.querySelector('body').style.color = this.textColor;
  }

  //#region loli
  loli = (text, style) => { // loli = log list with user name
    console.log(this.RID + '@' + this.userName + ': %c' + text, style);
  }





  //#region ifHideSet
  ifHideSet = () => { // whether the hidden imgs are invisible
    return document.getElementById('toggleHide')
    .style.backgroundImage === 'url("/images/eyes-blue.png")';
  }


  //#region showHidden
  showHidden = () => {
    document.getElementById('toggleHide').style.backgroundImage = 'url(/images/eyes-white.png)';
    for (let pic of document.querySelectorAll('.img_mini.hidden')) {
      pic.classList.remove('invisible');
    }
    this.numInvisible = 0;
    this.numShown = this.numImages;
    document.getElementById('toggleName').style.display = this.numShown ? '' : 'none';
  }

  //#region hideHidden
  hideHidden = () => {
    document.getElementById('toggleHide').style.backgroundImage = 'url(/images/eyes-blue.png)';
    let n = 0;
    for (let pic of document.querySelectorAll('.img_mini.hidden')) {
      // console.log('hideHidden:', pic.classList);
      pic.classList.add('invisible');
      n++;
      // this.loli('invisible: ' + n, 'color:red');
    }
    this.numInvisible = n;
    this.numShown = this.numImages - this.numInvisible;
      // this.loli('numShown: ' + this.numShown, 'color:yellow')
    document.getElementById('toggleName').style.display = this.numShown ? '' : 'none';
  }

  // Check each thumbnails' hide status and set classes
  //#region paintHideFlags
  paintHideFlags = async (first) => {
    // let order = this.updateOrder(true); // array if true, else text
    let order = this.sortOrder.split(LF);
      // console.log('paintHideFlags:', order);
    if (order.length === 1 && !order[0]) order = []; // NOTE!
    for (let p of order) {
      let i = p.indexOf(',');
      if (!p.slice(0, i)) this.loli('CommonStorageService error 1', 'color:red');
        // this.loli('i' + p.slice(0, i), 'color:red')
      var mini = document.getElementById('i' + p.slice(0, i));
        // console.log('paintHideFlags:', mini);
      if (mini) { // NOTE: There may be outdated rows in sortOrder!
        if (p[i + 1] === '1') {
            // this.loli('paintHideFlags (hidden) ' + p[i + 1], 'color:pink');
          mini.classList.add('hidden');
          if (this.ifHideSet() || first) mini.classList.add('invisible');
        } else {
          mini.classList.remove('hidden');
          mini.classList.remove('invisible');
        }
          // this.loli('ifHideSet=' + this.ifHideSet(), 'color:red');
          // console.log(document.getElementById('toggleHide').style.backgroundImage);
        if (this.ifHideSet() && p[i + 1] === '1') {
          mini.classList.add('invisible');
        } else {
          mini.classList.remove('invisible'); // there is some redundance here
        }
      }
    }
    // Count the number of shown, invisible, linked, unlinked, etc. images
    this.countNumbers();
  }

  //#region countNumbers
  // Will updare all image numbers in the current album and reloads it
  // which allso corrects the total nuber of images in the album.
  // So far, the albumTree in the menuMain is not updated!
  countNumbers = async () => {
    await new Promise (z => setTimeout (z, 129)); // countNumbers
    this.numImages = document.querySelectorAll('.img_mini').length;
    this.numMarked = document.querySelectorAll('.img_mini.selected').length;
    this.numHidden = document.querySelectorAll('.img_mini.hidden').length;
    await new Promise (z => setTimeout (z, 29)); // countNumbers
    if (this.numHidden) document.getElementById('toggleHide').style.display = '';
    else {
      document.getElementById('toggleHide').style.display = 'none';
      document.getElementById('toggleHide').style.backgroundImage = 'url(/images/eyes-blue.png)';
    }
    this.numInvisible = document.querySelectorAll('.img_mini.invisible').length;
    this.numLinked = document.querySelectorAll('.img_mini.symlink').length;
    await new Promise (z => setTimeout (z, 29)); // countNumbers
    this.numOrigin = this.numImages - this.numLinked;
    this.numShown = document.querySelectorAll('.img_mini').length - this.numInvisible;
    await new Promise (z => setTimeout (z, 229)); // countNumbers
    if (this.numImages !== this.numShown + this.numInvisible) {
      // If the total number of images in the open album (numImages) isn't correctly
      // updated at deletion/addition of images, one has to reload it, since the count
      // is made elsewhere in openAlbum.It may be done by pressing the reload button
      // with "document.getElementById('reLd').click();" or directly like here:
      // this.openAlbum(this.imdbDirIndex); // Reloads current album
      this.alertMess(this.intl.t('numbererror'), 0.25);
      this.loli('shown:' + this.numShown + ' + invisible:' + this.numInvisible + ' != sum:' + this.numImages, 'color:red');
    }
  }

  //#region clearMiniImgs
  clearMiniImgs = () => { // Remove any displayed
    for (let pic of document.querySelectorAll('div.img_mini')) pic.remove();
  }





  // Setting sec to 0 doesn't hinder `inherited Timeout` to close!
  //#region alertMess
  alertMess = async (mess, sec) => {
    this.closeDialog('dialogAlert'); // just in case
    this.closeDialog('dialogChoose'); // just in case
    this.infoHeader = this.intl.t('infoHeader'); // default header
    this.infoMessage = mess.replace(/\n/g, '<br>');
    this.openModalDialog('dialogAlert');
    if (sec) { // means close after sec seconds
      await new Promise (z => setTimeout (z, sec*1000)); // alertMess
      this.closeDialog('dialogAlert');
    }
  }

  //#region albumAllImg
  albumAllImg = (i) => { // number of original + symlink images in album 'i'
    let c = this.imdbCoco[i];
    let a = c.replace(/^.*(\(.+\)).*$/, '$1'); // NOTE; Avoiding eval(a)
      // this.loli('eval ' + a, 'color:red');
    a = a.slice(0, -1).slice(1).split('+');
      // this.loli('array ' + a, 'color:red');
    let v = 0;
    for (let d of a) v = v + Number(d);
      // this.loli('value ' + v, 'color:red');
    return v;
  }

  //#region totalOrigImg
  totalOrigImg = () => { // number of original images in total
    let n = 0;
    let c = this.imdbCoco;
    for (let i=0;i<c.length;i++) {
      n += Number(c[i].replace(/^[^(]*\(([0-9]+).*$/, '$1'));
    }
    return n;
  }

  //#region resetBorders
  resetBorders = () => { // Reset all mini-image borders and SRC attributes
    let minObj = document.querySelectorAll('.img_mini img.left-click');
    for (let min of minObj) {
      min.classList.remove('dotted');
    }
    // Resetting all minifile SRC attributes ascertains that any minipic is shown
    // (maybe created just now, e.g. at upload, any outside-click will show them)
    // NOTE: Is this outdated 2024? We'll test and see, perhaps 2025.
    for (let i=0; i<minObj.length; i++) {
      let minipic = minObj[i].src;
      minObj[i].removeAttribute('src');
      minObj[i].setAttribute('src', minipic);
    }
  }

  //#region markBorders
  // Flashing white thumbnail borders, highly temporary
  markBorders = async (namepic, from) => { // Mark a mini-image border
    // console.trace();
    // await new Promise (z => setTimeout (z, 25)); // Allow the dom to settle
      // this.loli('markBorders ' + namepic + ' ' + from, 'color:red');
      // console.log((new Error()).stack?.split("\n")[2]?.trim().split(" ")[1]);
      // console.log((new Error()).stack?.split("\n")[1]?.trim().split(" ")[1]);
    document.querySelector('#i' + this.escapeDots(namepic) + ' img.left-click').classList.add('dotted');
  }

  // Position to a minipic and highlight its border
  //#region gotoMinipic
  gotoMinipic = async (namepic) => {
      // this.loli('>' + namepic, 'color:red');
    if (!namepic) return;
      // this.loli(namepic, 'color:red');
    await new Promise (z => setTimeout (z, 39)); // gotoMinipic
    let hs = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    // this.loli('hs=' + hs, 'color:red');
    let h2 = hs/2;
    if (!namepic) this.loli('CommonStorageService error 2', 'color:red');
    // NOTE: No escapeDots for getElementById:
    let p = document.getElementById('i' + namepic);
      // this.loli('p=' + p, 'color:red');
    let y = p.offsetTop ? p.offsetTop : 0;
      // this.loli('y=' + y, 'color:red');
    y = p.offsetHeight ? y + p.offsetHeight/2 : y;
      // this.loli('y=' + y, 'color:red');
    let t = document.getElementById('highUp').offsetTop;
      // this.loli('top=' + t, 'color:red');
    let b = document.getElementById('lowDown').offsetTop;
      // this.loli('bottom=' + b, 'color:red');
    y -= h2 - 150;
      // this.loli('y-h2=' + y, 'color:red');
    if (y < t) y = t;
      // if (y > b - hs) y = b - hs;
    scrollTo(null, y);
      // this.resetBorders(); // Reset all borders
    this.markBorders(namepic, 'z.gotoMinipic'); // Mark this one
  }

  // Open or close the named show image, path = its path in the current album
  // showImage('') will close the show image and reopen the thumbnails
  //#region showImage
  showImage = async (name, path, e) => {
    // Here the thumbnail is clicked: is it with Ctrl or Shift?
    // If so, other than the 'show image' is demanded:
    if (e) {
      e.stopPropagation();
      let tgt = e.target;
      if (tgt.closest('.img_mini')) {
        // Does this ever happen?
        this.picName = tgt.closest('.img_mini').id.slice(1);
      }
      if (e.button === 0) { // mouse button
        if (!this.picName) this.loli('CommonStorageService error 3', 'color:red');
        let pic = document.getElementById('i' + this.picName);
        if (e.ctrlKey) {
          pic.querySelector('.menu_img').click();
          this.loli('opened menu of image ' + this.picName + ' in album ' + this.imdbRoot + this.imdbDir);
          return;
        }
        if (e.shiftKey) {
          pic.querySelector('div[alt="MARKER"]').click();
          return;
        }
      }
    }
    if (name) { //open
      await new Promise (z => setTimeout (z, 19)); // Just by suspicion
          // this.loli('show name: ' + name, 'color:red');
          // this.loli('show path: ' + path, 'color:red');
      // Set the actual picName, do not forget!
      this.picName = name;
      document.querySelector('.miniImgs.imgs').style.display = 'none'; //was 'flex'
      // Load the show image source path and set it's id="dname"
      let pic = document.querySelector('#link_show img');
      pic.src = path;
      // Copy the check mark class from the thumbnail
      if (!this.picName) this.loli('CommonStorageService error 4', 'color:red');
      let minipic = document.getElementById('i' + this.picName);
      let miniclass = minipic.querySelector('div[alt="MARKER"]').className;
      document.getElementById('markShow').className = miniclass + 'Show';
      // Copy display classes from the thumbnail
      let linkTexts = document.getElementById('link_texts');
      if (minipic.classList.contains('symlink')) {
        linkTexts.classList.add('symlink');
      } else {
        linkTexts.classList.remove('symlink');
      }
      if (minipic.classList.contains('hidden')) {
        linkTexts.classList.add('hidden');
      } else {
        linkTexts.classList.remove('hidden');
      }
      // Open the show image view
      document.querySelector('.img_show').style.display = 'table';
      // Hide the image menu button (here Ctrl+Click is used to open it)
      document.querySelector('.img_show button.menu_img').style.display = 'none';
      // Make the navigation overlay invisible
      document.querySelector('.toggleNavInfo').style.opacity = '0';

      // Show the right side buttons
      document.querySelector('.nav_links').style.display = '';
      // Hide the subalbums etc.
      document.querySelector('#smallButtons').style.display = 'none';
      document.querySelector('#upperButtons').style.display = 'none';
      document.querySelector('.albumsHdr').style.display = 'none';
      document.querySelector('p.footer').style.display = 'none';
      window.scrollTo(0,0);
    } else { //close
      this.edgeImage = '';
      // Hide the right side buttons
      document.querySelector('.nav_links').style.display = 'none';
      // if (document.querySelector('.img_show').style.display === 'none') return;??
      // Close the show image view
      document.querySelector('.img_show').style.display = 'none'; //was 'table'
      // Open the thumbnail view and update any selection mark changes
      document.querySelector('.miniImgs.imgs').style.display = 'flex';
      this.numMarked = document.querySelectorAll('.img_mini.selected').length;
      // Show the subalbums etc.
      document.querySelector('#smallButtons').style.display = '';
      document.querySelector('#upperButtons').style.display = '';
      document.querySelector('.albumsHdr').style.display = '';
      // Outline the closed image
      this.gotoMinipic(this.picName);
      document.querySelector('p.footer').style.display = '';
    }
    await new Promise (z => setTimeout (z, 99)); // showImage
    // If the dialogText is visible, it should focus
    document.getElementById('dialogTextDescription').focus();
  }

  // Show the next or previous slideshow image
  //#region showNext
  showNext = async (forward, e) => {
    // Here the image's invisible overlay is clicked: with Ctrl or Shift?
    // If so, other than next or previous image is demanded:
    if (e) {
      e.stopPropagation();
      if (e.button === 0) {
        if (e.ctrlKey) {
          // Here, to avoid Ctrl+A-marking, some elements
          // must have CSS with 'user-select: none;'
          e.target.parentElement.style.userSelect = 'none';
          let uli = document.querySelector('#link_show ul');
          if (uli.style.display === '') {
            uli.style.display = 'none';
            this.loli('closed menu of image ' + this.picName + ' in album ' + this.imdbRoot + this.imdbDir);
          } else {
            uli.style.display = '';
            this.loli('opened menu of image ' + this.picName + ' in album ' + this.imdbRoot + this.imdbDir);
          }
          return;
        }
        if (e.shiftKey) {
          document.getElementById('markShow').click();
          return;
        }
      }
    }
    var next, nextName, ino = 0;
    if (!this.picName) this.loli('CommonStorageService error 5', 'color:red');
    var actual = document.getElementById('i' + this.picName);
    var actualParent = actual.parentElement;
    var allFiles = this.allFiles;
    if (forward) {

      ino = 0; // börja längst framifrån ??
      // Ensure that invisibles are skipped over
      while (actual.nextElementSibling && actual.nextElementSibling.classList.contains('invisible')) {
        actual = actual.nextElementSibling;
        ino++;
      }
      next = actual.nextElementSibling;

      if (next) {
        nextName = (next.id).slice(1);
        ino++;
      } else { // Go to the beginning
        next = actualParent.firstElementChild;
        ino = 1;

        // Ensure once again that invisibles are skipped over
        if (next && next.classList.contains('invisible')) {
          while (next.nextElementSibling && next.nextElementSibling.classList.contains('invisible')) {
            next = next.nextElementSibling;
            ino++;
          }
          next = next.nextElementSibling;
        }
        if (next) nextName = (next.id).slice(1);
      }

    } else { // backward

      ino = this.numImages + 1; // börja längst bakifrån ??
      // Ensure that invisibles are skipped over
      while (actual.previousElementSibling && actual.previousElementSibling.classList.contains('invisible')) {
        actual = actual.previousElementSibling;
        ino--;
      }
      next = actual.previousElementSibling;

      if (next) {
        nextName = (next.id).slice(1);
        ino--;
      } else { // Go to the beginning
        next = actualParent.lastElementChild;
        ino = this.numImages + 1;

        // Ensure once again that invisibles are skipped over
        if (next && next.classList.contains('invisible')) {
          while (next.previousElementSibling && next.previousElementSibling.classList.contains('invisible')) {
            next = next.previousElementSibling;
            ino--;
          }
          next = next.previousElementSibling;
        }
        if (next) nextName = (next.id).slice(1);
      }

    }

    if (nextName) {
        // console.log(allFiles);
      let i = allFiles.findIndex(all => {return all.name === nextName;});
        // this.loli('index=' + i);
      let path = '';
      if (i > -1) {
        this.picName = nextName;
        i = await this.picIndex();
        path = allFiles[i].show;
        this.showImage(nextName, path);
      }
      // The order of 'allFiles' may not reflect DOM content which may be rearranged
      this.edgeImage = '';
      actual = document.querySelector('#i' + this.escapeDots(this.picName));
      if (!actual.nextElementSibling) this.edgeImage = this.intl.t('imageLast');
      else if (!actual.previousElementSibling) this.edgeImage = this.intl.t('imageFirst');
      // else this.edgeImage = this.intl.t('imageNumber', {n: ino})
    }
      // this.loli('end of showNext', 'color:red');
    await new Promise (z => setTimeout (z, 99)); // showNext
    // If the dialogText is visible, it should focus
    document.getElementById('dialogTextDescription').focus();
  }

  // Search album texts to find images
  //#region doFindText
  doFindText = () => {
    if (this.missingRoot()) return;
    this.openDialog('dialogFind');
    this.closeMainMenu('after opening find dialog'); // Close the main menu
  }

  // Check if the alert dialog is open (then close it), or if no
  // album root/collection (imdbRoot) is chosen (then open it)
  //#region missingRoot
  missingRoot = () => {
    if (document.getElementById('dialogAlert').hasAttribute('open')) {
      this.closeDialog(dialogAlertId);
    }
    if (!this.imdbRoot) {
      // alertMess opens the alert dialog
      this.alertMess(this.intl.t('needaroot'), 0);
      document.querySelector('.mainMenu select').focus();
      return true;
    }
    return false;
  }

  //#region COOKIES
  //== Cookie names are mish_lang, mish_bkgr, ...
  setCookie = (cname, cvalue, exminutes) => {
    if (exminutes) {
      var d = new Date();
      d.setTime(d.getTime() + (exminutes*60000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Lax";
    } else {
      document.cookie = cname + "=" + cvalue + ";path=/;SameSite=Lax";
    }
  }
  getCookie = (cname) => {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }


  //   #region SERVER
  //== Server tasks







  //#region xhrsetreqhdr
  xhrSetRequestHeader = (xhr) => {
    xhr.setRequestHeader('username', encodeURIComponent(this.userName));
    xhr.setRequestHeader('imdbdir', encodeURIComponent(this.imdbDir));
    xhr.setRequestHeader('imdbroot', encodeURIComponent(this.imdbRoot));
    xhr.setRequestHeader('picfound', this.picFound); // All 'wihtin 255' characters
  }

  //#region execute/
  execute = async (command) => { // Execute on the server, return a promise
    if (!command) return;
    return new Promise((resolve, reject) => {
      command = command.replace (/%/g, "%25");
      var xhr = new XMLHttpRequest ();
      xhr.open('GET', 'execute/', true, null, null);
      // this.xhrSetRequestHeader(xhr);
      // Do not use xhrSetRequestHeader here, perhaps bad user name timing?
      xhr.setRequestHeader('username', encodeURIComponent(this.userName));
      xhr.setRequestHeader('imdbdir', encodeURIComponent(this.imdbDir));
      xhr.setRequestHeader('imdbroot', encodeURIComponent(this.imdbRoot));
      xhr.setRequestHeader('picfound', this.picFound); // All 'widhtin 255' characters
      xhr.setRequestHeader('command', encodeURIComponent(command));
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response.trim ();
          resolve(data);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  }

  //#region fullsize/
  // Get a full size image
  getFullSize = async (filePath) => {
    return new Promise(async (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      xhr.open('GET', 'fullsize/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.setRequestHeader('path', encodeURIComponent(filePath));
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response.trim();
          resolve(data);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  }

  //#region filestat/
  // Get file information
  getFilestat = async (filePath) => {
    return new Promise(async (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      xhr.open('GET', 'filestat/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.setRequestHeader('path', encodeURIComponent(filePath));
      xhr.setRequestHeader('intlcode', encodeURIComponent(this.intlCodeCurr));
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response.trim();
          resolve(data);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  }

  //#region login/
  getCredentials = async (username) => {
    username = username.trim();
      // this.loli(this.userName, 'color:yellow');
    if (username === 'Get user name') { // Welcome, initiation
      username = this.userName; // Default log in
      // this.imdbRoot = ''; // Empty it
    }
    if (username === 'Get allowances') username = ''; // For all users
    return new Promise((resolve, reject) => {
      // ===== XMLHttpRequest returning user credentials
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'login/', true, null, null);
      // Do not use xhrSetRequestHeader here, perhaps bad user name timing?
      xhr.setRequestHeader('username', encodeURIComponent(username));
      xhr.setRequestHeader('imdbdir', encodeURIComponent(this.imdbDir));
      xhr.setRequestHeader('imdbroot', encodeURIComponent(this.imdbRoot));
      xhr.setRequestHeader('picfound', this.picFound); // All 'widhtin 255' characters
      xhr.onload = function() {
        let res = xhr.response;
        resolve(res);
      }
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
      xhr.send();
    }).catch(error => {
      console.error(error.message);
    });
  }

  //#region rootdir/
  getAlbumRoots = async () => {
    // Propose root directory (requestDirs)
    return new Promise ( (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      xhr.open('GET', 'rootdir/', true, null, null);
      // this.xhrSetRequestHeader(xhr);
      // Do not use xhrSetRequestHeader here, perhaps bad user name timing?
      xhr.setRequestHeader('username', encodeURIComponent(this.userName));
      xhr.setRequestHeader('imdbdir', encodeURIComponent(this.imdbDir));
      xhr.setRequestHeader('imdbroot', encodeURIComponent(this.imdbRoot));
      xhr.setRequestHeader('picfound', this.picFound); // All 'widhtin 255' characters
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var dirList = xhr.response;
          resolve(dirList);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    }).catch(error => {
      if (error.status !== 404) {
        console.error (error.message);
      } else {
        console.warn ("reqRoot: No NodeJS server");
      }
    });
  }

  //#region imdbdirs/
  // Do not move 'getAlbumDirs' to 'menu-main.gjs' in order to balance
  // code lines more reasonably between source files! Since it is also
  // called by 'updateTree' which is called from 'menu-image.gjs'!
  getAlbumDirs = async (getHidden) => {
    // Get album collections or albums if we are at an album root
    return new Promise((resolve, reject) => {
      // ===== XMLHttpRequest returning user credentials
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'imdbdirs/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.setRequestHeader('hidden', getHidden ? 'true' : 'false');
      xhr.onload = function() {
        let res = xhr.response;
        resolve(res);
      }
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
      xhr.send();
    }).catch(error => {
      console.error(error.message);
    });
  }

  //#region imagelist/
  // WAS: requestNames = async () => { // ===== Request the file information list
  getImages = async () => { // ===== Get the image files information list
    // NEPF = number of entries (lines) per file in the plain text-line-result list
    // ('namedata') from the server. The main information (e.g. metadata) is retreived
    // from each image file. It is reordered into 'newdata' in 'sortnames' order, as
    // far as possible; 'sortnames' is cleaned from non-existent (removed) files and
    // extended with new (added) files, in order as is. So far, a row of sort order is
    // 'sortnames', hideFlag, and an unused 'zero'; comma separated
    var that = this;
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'imagelist/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.onload = function() {
        var allow = that.allow;
        var allfiles = [];
       if (this.status >= 200 && this.status < 300) {
          var NEPF = 7; // Number of rows per file in xhr.response
          var result = xhr.response;
          result = result.trim ().split (LF); // result is vectorised
          var i = 0, j = 0;
          var n_files = result.length/NEPF;
          if (n_files < 1) { // Covers all weird outcomes
            result = [];
            n_files = 0;
            that.numHidden = 0;
            that.numInvisible = 0;
            that.numMarked = 0;
            that.numShown = 0;
          }
          for (i=0; i<n_files; i++) {
            result [j + 4] = result [j + 4].replace (/&lt;br&gt;/g,'<br>'); // j + 5??
            var f = {
              orig: result[j],        // orig-file path (...jpg|tif|png|...)
              show: result[j + 1],    // show-file path (_show_...png)
              mini: result[j + 2],    // mini-file path (_mini_...png)
              name: result[j + 3],    // Orig-file base name without extension
              txt1: htmlSafe(result [j + 4]), // xmp.dc.description metadata
              txt2: htmlSafe(result [j + 5]), // xmp.dc.creator metadata
              symlink: result[j + 6], // & or else, the value for linkto
              linkto: '',             // which is set when reorganized below
              albname: ''             // "    (short name for symlink's original album)
            };
            if (f.txt1.toString() === '-') {f.txt1 = '';}
            if (f.txt2.toString() === '-') {f.txt2 = '';}

            // From the server: f.symlink=& for ordinary files, else it is the linked-to
            // relative file path. This is reorganized as follows:
            f.linkto = f.orig; // The real file path
            if (f.symlink === '&') {
              f.symlink = '';
            } else {
              let tmp = f.symlink;
                  // HOW this missing slash??????????misunderstnding
                  // f.orig = '/' + tmp; // The actual path in this context
              f.orig = tmp; // The actual path in this context
              f.symlink = 'symlink';
              tmp = tmp.replace(/^([.]*\/)+/, that.imdbRoot + "/").replace(/^([^/]*\/)*([^/]+)\/[^/]+$/, "$2");
              f.albname = that.removeUnderscore(tmp, true);
            }

            // // Explanations among printouts below, the namings may seem weird - be careful!
            // let tmp = f.symlink ? f.symlink : 'ordinary';
            // that.loli(tmp, 'color:white');
            // // The real file reference, if symlink: its resolution (from here):
            // that.loli('  reference (orig): ' + f.orig, 'color:brown');
            // // The real file path (root to be added),same as f.orig if ordinary:
            // that.loli(' formally (linkto): ' + f.linkto, 'color:orange');
            // // This file's real album's readable short name:
            // that.loli('in album (albname): ' + f.albname, 'color:yellow');

            j = j + NEPF;
            allfiles.push(f);
          }

          // ///document.querySelector('.showCount:first').style.display = '';
          document.querySelector('.miniImgs').style.display = '';
          if (n_files < 1) {
            document.getElementById('toggleName').style.display = 'none';
            document.getElementById('toggleHide').style.display = 'none';
          }
          else {
            document.getElementById('toggleName').style.display = '';
            if (allow.imgHidden) document.getElementById('toggleHide').style.display = '';
          }

          //userLog ('INFO received');
          resolve(allfiles); // Return file-list object array
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    })
    .then ()
    .catch(error => {
      console.error ("In getImages:", error.message);
    });
  }

  //#region sortlist/
  // Is actually a getOrder function, corresponding to saveOrder below
  // The namings 'sortlist' and 'requestOrder' are from historical reasons
  requestOrder = async () => {
    // Request the sort order list of image files
    return new Promise ( (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      xhr.open('GET', 'sortlist/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.onload = async function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response.trim ();
          if (data.slice (0, 8) === '{"error"') {
            data = "Error!"; // This error text may also be generated elsewhere
          }
          resolve(data); // Return file-name text lines
          // console.log ("ORDER received");
        } else {
          resolve("Error!");
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        resolve("Error!");
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    }).catch(error => {
      console.error (error.message);
    });
  }

  //#region saveorder/
  //the name coincides with the saveOrder left button
  saveOrder = async () => {
    if (this.imdbDir === this.picFound || !this.allow.saveChanges) return;
    // assemble the new sortOrder list
    this.sortOrder = this.updateOrder();
    // then replace the order file in the album
    // document.getElementById("divDropZone").style.display = "none"; // If shown...
    var that = this;
    return new Promise( (resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'saveorder/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          resolve(true); // Can we forget 'resolve'?
          that.alertMess(that.intl.t('saved'), 3);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      }
      xhr.send(that.sortOrder);
    }).catch(error => {
      console.error(error.message);
    });
  }
  updateOrder = (noJoin) => {
    let old = this.sortOrder.split(LF);
    let name = [];
    let hide = [];
    for (let elem of document.querySelectorAll('div.img_mini')) {
      name.push(elem.id.slice(1));
      if (elem.classList.contains('hidden')) {
        hide.push(',1,0');
      } else {
        hide.push(',0,0');
      }
    }
    for (let i=0;i<name.length;i++) {
      name[i] += hide[i];
    }
      // this.loli(LF + name.join(LF), 'color:red');
    if (noJoin) {
      return name;
    } else {
      return name.join(LF);
    }
  }

  //#region savetext/
  //saving image captions as metadata: saveText(filePath +'\n'+ txt1 +'\n'+ txt2);
  placeMess = () => {
    let textel = document.getElementById('dialogText');
    let messel = document.getElementById('dialogAlert');
    // Copy the screen coordinates to keep them close
    messel.style.transform = textel.style.transform;
  }
  saveText = async (txt) => {
    var that = this;
    return new Promise( (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      xhr.open('POST', 'savetext/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.onload = function () {
        if (xhr.response) {
            console.log(xhr.response);
          that.loli('Xmp.dc metadata not saved for ' + that.picName, 'color:red');
          let edpn = that.escapeDots(that.picName);
          document.querySelector('#i' + edpn + ' .img_txt1').innerHTML = '';
          document.querySelector('#i' + edpn + ' .img_txt2').innerHTML = '';
          let mess = that.intl.t('errTxtNotSaved') + '<br><br>';
          mess += that.intl.t('errTxtCannotSave') + '<br><br>';
          mess += that.intl.t('errTxtRecover');
          that.alertMess(mess, 0);
          that.placeMess();
        } else {
          that.loli('Xmp.dc metadata saved for ' + that.picName);
          let mess = that.intl.t('captionFor') + ' <b style="color:black">' + that.picName + '</b> ' + that.intl.t('captionSaved');
          that.alertMess(mess, 1.5);
          that.placeMess();
        }
      }
      xhr.send(txt);
    }).catch(error => {
      console.error(error.message);
    });
  }

  //#region sqlupdate/
  // Update the sqlite text database (symlinked pictures auto-omitted)
  // Called from eraseFunc and doLinkMove in menu-image.gjs
  sqlUpdate = (picPaths) => { // Must be complete server paths (LF-joined)
    if (!picPaths) return;
    let data = new FormData();
    data.append ("filepaths", picPaths);
    return new Promise ( (resolve, reject) => {
      let xhr = new XMLHttpRequest ();
      xhr.open('POST', 'sqlupdate/', true, null, null);
      this.xhrSetRequestHeader(xhr);
      xhr.onload = function() {
        resolve(xhr.response); // empty
      };
      xhr.onerror = function () {
        resolve(xhr.statusText);
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
      xhr.send (data);
    });
  }

  //#region search/
  /**
  searchText: contains the server search/ call

  Search the image texts in the current imdbRoot (cf. prepSearchDialog)
  @param {string}  sTxt space separated search items
  @param {boolean} and true=>AND | false=>OR
  @param {boolean} searchWhere array, checkboxes for selected texts
  @param {integer} exact <>0 removes SQL ´%´s (>0 means origin dialogTextNotes, <0 dialogFind)
  @returns {string} \n-separated file paths
  NOTE: Non-zero ´exact´ also means "Only search for image names (file 'basenames')!"
  NOTE: Negative ´exact´, -1 = called from the find? dialog, -2 = do nothing,
        else (non-negative) = called from and return to the favorites? dialog
  **/
  searchText = async (sTxt, and, searchWhere, exact) => {
    // Display the spinner
    document.querySelector('img.spinner').style.display = '';
    // close all dialogs is unneccessary
    document.getElementById('go_back').click(); // close show, perhaps unneccessary
    let AO, andor = '';
    if (and) {AO = ' AND '} else {AO = ' OR '};
    if (sTxt === "") {sTxt = undefined;}
    let cmt = '';
    // The first line may be a comment, to ignore:
    if (sTxt.slice (0, 1) === '#') {
      let l = sTxt.indexOf('\n');
      cmt = sTxt.slice(1, l); // comment line, may be used as header
      sTxt = sTxt.slice(l + 1);
        // this.loli(cmt, 'color:yellow');
    }
    let txt = sTxt.trim();
    let str = '';
    let arr = [];
    if (!txt) {
      document.querySelector('#dialogFind textarea').value = '';
      return '';
    } else {
      txt = txt.replace(/\s+/g, ' ').trim();
        // this.loli(txt, 'color:red');
      arr = txt.split (' ');
      for (let i = 0; i<arr.length; i++) {
        // Replace any `'` with `''`: will be enclosed within `'`s in SQL
        arr[i] = arr[i].replace (/'/g, "''");
        // Replace underscore to be taken literally, needs `ESCAPE '\'`
        arr[i] = arr[i].replace (/_/g, '\\_');
        // First replace % (NBSP):
        arr[i] = arr[i].replace (/%/g, ' '); // % in Mish means 'sticking space'
        // Then use % the SQL way if applicable and add `ESCAPE '\'` for '_':
        let esc = arr[i].indexOf('_') < 0 ? "'" : "' ESCAPE '\\'";
        // Exact match for file (base) names, e.g. favorites search
        if (exact !== 0) {
          arr[i] = "'" + arr[i] + esc;
        } else {
          arr[i] = "'%" + arr[i] + '%' + esc;
        }
        if (i > 0) {andor = AO}
        str += andor + "txtstr LIKE " + arr[i].trim ();
      }
        // // A double printout clarifies the %-autosubstitution of console.log
        // this.loli(str, 'color:orange  ');
        // this.loli(str.replace(/%/g, '*'), 'color:yellow');
        // console.log(searchWhere);
      // var srchData = new FormData();
      // srchData.append("like", str);
      // srchData.append("cols", searchWhere);
      // if (exact !== 0) srchData.append("info", "exact");
      // else srchData.append("info", "");
      var srchData = JSON.stringify({
        like: str,
        cols: searchWhere,
        info: exact === 0 ? '' : 'exact'
      });
        console.log(srchData);
      return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('POST', 'search/', true, null, null);
        this.xhrSetRequestHeader(xhr);
        xhr.setRequestHeader('content-type', 'application/json');
        xhr.onload = function() {
          if (this.status >= 200 && this.status < 300) {
            var data = xhr.response.trim();
            if (exact !== 0) { // reorder like sTxt
              var datArr = data.split("\n");
                // console.log("searchText datArr.length",datArr.length);
              var namArr = [];
              var seaArr = [];
              var tmpArr = [];
              var albArr = [];
              for (let i=0; i<datArr.length; i++) {
                namArr[i] = datArr[i].replace(/^(.*\/)*(.*)(\.[^.]*)$/,"$2");
                tmpArr[i] = namArr[i]; // Just in case
                albArr[i] = datArr[i].replace(/^(.*\/)*(.*)(\.[^.]*)$/,"$1").slice(1, -1);
              }
              sTxt = sTxt.replace(/ +/g, " ");
              if (arr.length > 0) seaArr = sTxt.split(" ");
              // The 'reordering template' (seaArr) depends on this special switch set in altFind:
              if (seaArr[0] === "dupName/") seaArr = tmpArr.sort();
              else if (seaArr[0] === "dupImage/") seaArr.splice(0, 1);
              else if (seaArr[0] === "actualDups/") seaArr.splice(0, 1);
              else if (seaArr[0] === "subAlbDups/") seaArr.splice(0, 1);

              data = [];
              for (let i=0; i<seaArr.length; i++) {
                for (let j=0; j<namArr.length; j++) {
                  if (seaArr[i] === namArr[j]) {
                    data[i] = datArr[j];
                    namArr[j] = "###";
                    break;
                  }
                }
              }
              data = data.join("\n");
            }
            resolve(data);
          } else {
            reject({
              status: this.status,
              statusText: xhr.statusText
            });
          }
        }
          console.log(srchData);
        xhr.send(srchData);
      });
    }
  }

  //#region upload/
  upload = async (files) => {
    var that = this;
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open('POST', 'upload/', true, null, null);
      this.xhrSetRequestHeader(xhr); // set default headers
      xhr.setRequestHeader('body', files);
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.response.trim ();
          that.loli('data' + LF + data, 'color:red');
          resolve(data);
          that.loli(LF + data, 'color:red');
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      }
      xhr.send('');
    });
  }

  //   #region MENUS
  //== Menu utilities

  openMainMenu = async (e) => {
    if (e) e.stopPropagation();
    var menuButton = document.getElementById('menuButton');
    var menuMain = document.getElementById('menuMain');
    menuMain.style.display = '';
    await new Promise (z => setTimeout (z, 9)); // openMainMenu
    menuButton.style.background = "#444 url('/images/cross.png') center 0.6rem/0.9rem no-repeat";
    // Ensure that the main menu behaves
    let ifshow = this.imdbRoot ? '' : 'none';
    document.getElementById('albumHead').style.display = ifshow;
    document.querySelector('div.albumTree').style.display = ifshow;
    await new Promise (z => setTimeout (z, 29)); // openMainMenu
      // console.log('menuButton', menuButton);
    this.loli('opened main menu');
    return '';
  }

  closeMainMenu = async (msg) => {
    var menuMain = document.getElementById('menuMain');
    if (menuMain.style.display === 'none') return '';
    var menuButton = document.getElementById('menuButton');
    menuMain.style.display = 'none';
    await new Promise (z => setTimeout (z, 9)); // closeMainMenu
    menuButton.style.background = "#444 url('/images/favicon0.png') center 0.3rem/1.5rem no-repeat"; // Also in CSS (app.css)
    await new Promise (z => setTimeout (z, 29)); // closeMainMenu
      // console.log('menuButton', menuButton);
    this.loli('closed main menu ' + msg);
    return '';
  }

  toggleMenuImg = async (open, e) => {
    if (e) {
      // e.preventDefault();
      e.stopPropagation();
      var tgt = e.target.closest('.img_mini');
    }
    if (tgt) {
      let id = tgt.id;
      let name = id.slice(1);
      this.picName = name;
    }
    let name = this.picName;
      // this.loli(this.picName + ':', 'color:red');
      // console.log(this.allFiles[await this.picIndex()])

    const loliClose = (name) => this.loli('closed menu of image ' + name + ' in album ' + this.imdbRoot + this.imdbDir);

    let list = document.querySelector('#i' + this.escapeDots(name) + ' .menu_img_list');
    if (!list.style.display) open = 0;
    if (open) { // 1 == do open
      let allist = document.querySelectorAll('.menu_img_list');
      // If another image menu is open, close it:
      for (let list of allist) {
        if (!list.style.display) {
          list.style.display = 'none';
          this.closeDialog('dialogAlert'); // May iterfer, later
            // this.loli('toggleMenuImg: ' + list.style.display, 'color:red');
            // console.log(list);
          let name = list.closest('.img_mini').id.slice(1);
          loliClose(name);
          break;
        }
      }
      list.style.display = '';
      // this.markBorders(name);
      this.loli('opened menu of image ' + name + ' in album ' + this.imdbRoot + this.imdbDir);

    } else { // 0 == do close
      // this.markBorders(name); // Since this was the most recent image menu
      list.style.display = 'none';
      loliClose(name);
    }
  }

  //   #region DIALOGS
  //== Dialog utilities for open/close/modal ...

  // Functions openDialog(id, op), toggleDialog(id, op), openModalDialog(id, op),
  // saveDialog(id), closeDialog(id), and saveCloseDialog(id) (= save then close),
  // where id = `dialogId` and op = 'original position'. If op is `true` then the dialog
  // is opened in the original position -- else opened where it was left at last close.
  // The close function may be modified to return to original position before closing.

  openDialog = async (dialogId, origPos) => {
    let diaObj = document.getElementById(dialogId);
    await new Promise (z => setTimeout (z, 20)); // openDialog
    if (!diaObj.open) {
      diaObj.show();
      if (origPos) diaObj.style = '';
      this.loli('opened ' + dialogId);
    }
  }

  toggleDialog = async (dialogId, origPos) => {
    let diaObj = document.getElementById(dialogId);
    let what = 'closed ';
    await new Promise (z => setTimeout (z, 20)); // toggleDialog
    if (diaObj.hasAttribute('open')) {
      diaObj.close();
    } else {
      what = 'opened ';
      await new Promise (z => setTimeout (z, 20)); // toggleDialog
      if (origPos) diaObj.style.display = '';
      diaObj.show();
    }
    this.loli(what + dialogId);
  }

  openModalDialog = (dialogId, origPos) => {
    // Close all dialogs before login change:
    if (dialogId === 'dialogLogin') this.closeDialogs();
    // Reset this dialogChoose before opening:
    let diaObj = document.getElementById(dialogId);
    if (dialogId === 'dialogChoose') {
      document.getElementById('Choice_3').checked = false;
      document.querySelector('span.Choice_3').style.display = 'none';
    }
    if (!diaObj.open) {
      if (origPos) diaObj.style = '';
      if (!diaObj.style.top) diaObj.style.top = '-40vh';
      diaObj.showModal();
      this.loli('opened ' + dialogId + ' (modal)');
    }
  }

  saveDialog = async (dialogId) => {
    // should have alternatives for any dialogId occurring with 'save' button
    if (dialogId === 'dialogText' && await this.picIndex() > -1) {
      // Close any previous alert:
      this.closeDialog('dialogAlert');
      let f = this.allFiles[await this.picIndex()];
      let path = '';
      if (f.symlink) {
        path = f.orig; //** see below
          // this.loli(path, 'color:red');
      } else {
        path = f.linkto;
          // this.loli(path,'color:yellow');
      }
      let gif = /\.gif$/i.test(path);
      let txt1 = document.getElementById('dialogTextDescription').value;
      txt1 = this.normalize2br(txt1, true); // true: leave end untrimmed
        // this.loli(txt1,'color:yellow');
      this.allFiles[await this.picIndex()].txt1 = txt1;
      document.getElementById('dialogTextDescription').value = txt1.replace(/<br>/g, '\n');

      let  txt2 = document.getElementById('dialogTextCreator').value;
      txt2 = this.normalize2br(txt2); // also trim end
        // this.loli(txt2,'color:yellow');
      this.allFiles[await this.picIndex()].txt2 = txt2;
      document.getElementById('dialogTextCreator').value = txt2.replace(/<br>/g, '\n');

      // When the img_mini pictures are visible,
      if (document.querySelector('.miniImgs.imgs').style.display !== 'none') {
        // let size = this.albumAllImg(this.imdbDirs.indexOf(this.imdbDir));
        // await new Promise (z => setTimeout (z, size*6 + 10)); // album rerender
      } else { // else the img_show picture is visible
        document.querySelector('#link_texts .img_txt1').innerHTML = txt1;
        document.querySelector('#link_texts .img_txt2').innerHTML = txt2;
      }
      // console.log(this.allFiles[await this.picIndex()])
      this.refreshTexts ++; // Change trigger to rerender by RefreshThis
      let size = this.albumAllImg(this.imdbDirs.indexOf(this.imdbDir));
      await new Promise (z => setTimeout (z, size*6 + 10)); // album rerender
      this.paintHideFlags(); // AFTER RERENDER!
      this.markBorders(this.picName, 'z.saveDialog');
      // Remove the initial '../..etc.' if 'path' is from 'f.orig' //**
      path = this.imdbRoot + path.replace(/^\.*(\/\.+)*/, '');
        // this.loli(path, 'color:red');
      if (!gif) {
        await this.saveText(path + LF + txt1 + LF + txt2);
        // this.loli('saved ' + dialogId); // is confirmed by 'saveText'
        return;
      }
    }
  }

  closeDialog = (dialogId) => {
    let diaObj = document.getElementById(dialogId);
    if (document.querySelector('#' + dialogId + ' button.unclosable')) return;
    if (diaObj && diaObj.open) {
      diaObj.close();
      this.loli('closed ' + dialogId);
    }
  }

  saveCloseDialog = async (dialogId) => {
    this.saveDialog(dialogId);
    await new Promise (z => setTimeout (z, 123)); // saveCloseDialog
    this.closeDialog(dialogId);
  }

  closeDialogs  = () => { // Close ALL <dialog>s except alerts
    for (let diaObj of document.getElementsByTagName('dialog')) {
      if (diaObj.open && diaObj.id !== 'dialogAlert') {
        diaObj.close();
        this.loli('closed ' + diaObj.id);
      }
    }
  }
}
//   #region END
//   #endregion
