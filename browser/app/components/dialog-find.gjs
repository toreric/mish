//== Mish dialog for image searches (in texts: captions etc.)

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { htmlSafe } from '@ember/template';
import { Spinner } from './spinner';

// Note: Dialog-functions in Header needs dialogFindId:
export const dialogFindId = 'dialogFind';

// // Important: ”document.body.” excludes SCROLLBARS, if any!
// document.body.addEventListener('mousedown', async (e) => {
//   e.stopPropagation();
//     // console.log('dialog-find', e.target.tagName);
//   let tgt = e.target;
//   await new Promise (z => setTimeout (z, 99)); // dialogFind
//   // Position the clicked of these two at top
//   // let i1 = Number(document.querySelector('#dialogFind').style.zIndex);
//   // let i2 = Number(document.querySelector('#dialogFindResult').style.zIndex);
//     // console.error(i1 + ' ' + i2);
//   // if (tgt.closest('#dialogFind') && i1 < i2) document.querySelector('#dialogFindResult').style.zIndex = i1 - 1;
//   // if (tgt.closest('#dialogFindResult') && i2 < i1) document.querySelector('#dialogFindResult').style.zIndex = i1 + 1;
// });

document.addEventListener('keydown', (e) => {
  if (e.keyCode === 27) {
    e.stopPropagation();
    if (document.getElementById('dialogFindHelp').open) {
      document.getElementById('dialogFindHelp').close();
      console.log('-"-: closed dialogFindHelp');
    } else if (document.getElementById('dialogFindResult').open) {
      document.getElementById('dialogFindResult').close();
      console.log('-"-: closed dialogFindResult');
    } else if (document.getElementById(dialogFindId).open) {
      document.getElementById(dialogFindId).close();
      console.log('-"-: closed ' + dialogFindId);
    }
  }
});

//== Component DialogFind with <dialog> tags
export class DialogFind extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked countAlbs = []; // appears never used

  @tracked nchk = 0;       // tot no found
  @tracked keepIndex = []; // indices of albums where found
  @tracked inames = [];    // found image names
  @tracked counts = [];    // counts of found images/album
  @tracked commands = [];  // creating links to found images
  @tracked ixFound = -2;   // index to picFound album

  iname = (i) => {
    return this.inames[i];
  }
  count = (i) => {
    return ("     " + this.counts[i]).slice(-5).replace(/ /g, '&nbsp');
  }
  album = (i) => {
    return this.z.imdbDirs[i];
  }

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      if (document.getElementById('dialogFindHelp').open) {
        this.z.closeDialog('dialogFindHelp');
      } else if (document.getElementById(dialogFindId).open) {
        this.z.closeDialog(dialogFindId);
      }
    }
  }

  get searchNotes() {
    return htmlSafe(this.z.allow.notesView ? '' : 'none');
  }

  get albumFound() {
    return this.z.handsomize2sp(this.z.picFound);
  }

  // ''/_imdb_order.txt'' finds texts in the database (file _imdb_images.sqlite)
  // and populates the 'picFound' album with the corresponding images
  doFindText = async () => {
    let sTxt = document.querySelector('textarea[name="searchtext"]').value + '\n';
    let and = document.querySelectorAll('.orAnd input[type="radio"]')[0].checked;
    let sWhr = [];
    let n = 0;
    for (let srch of document.querySelectorAll('.srchIn input[type="checkbox"]')) {
      sWhr.push(srch.checked);
      if (srch.checked) n++;
    }
    // Do not 'search nowhere', choose at least the image caption!
    if (n === 0)  {
      document.querySelectorAll('.srchIn input[type="checkbox"]')[0].checked = true;
      sWhr[0] = true;
    }
    let nameOrder = [];

    // Do find images using 'searchText':

    /** The 'searchText' parameters
    @param {string}  sTxt whitespace separated search text words/items
    @param {boolean} and  true=>AND (find all) | false=>OR (find any)
    @param {boolean} sWhr (searchWhere) array = checkboxes for selected texts
    @param {integer} exact when <>0, the LIKE searched items will NOT be '%' surrounded
    NOTE: Non-zero ´exact´ also means "Only search for image names (file basenames)!"
    NOTE: Negative ´exact´, -1 = called from the find? dialog, -2 = do nothing,
          else (non-negative) = called from and return to the favorites? dialog
    Example: Find pictures by exact matching of image names (file basenames), e.g.
      doFindText ("img_0012 img_0123", false, [false, false, false, false, true], -1)
    **/
    let data = await this.z.searchText(sTxt, and, sWhr, 0);
    // Hide the spinner
    document.querySelector('img.spinner').style.display = 'none';
    if (!data) {
      this.z.alertMess(this.intl.t('write.noneFound'), 6);
      document.querySelector('#dialogFind textarea').focus();
      return '';
    }

    this.commands = []; // Commands to create links in picFound
    let paths = []; // The found paths
    let albs = [];  // The list of found albums
    let lpath = this.z.imdbPath + '/' + this.z.picFound; // The path to picFound
    // Maximum number of pictures from the search results to show:
    let nLimit = 100;
    let filesFound = 0;
    let chalbs = this.z.imdbDirs;
    if (data) {
      // Don't sort, order may be important if this is a search for duplicates. Then
      // this is the final re-search by image names in sequence. The result is presented
      // in the same given order where similar images are grouped together.
      paths = data.trim().split('\n');//.sort ();
      // Remove possibly empty values:
      paths = paths.filter(a => {if (a.trim()) return true; else return false});
      // NOTE: 'paths' is the basis of the innerHTML content of 'dialogFindResult'
        // this.z.loli('paths:\n' + paths.join('\n'), 'color:pink');
        // console.log(paths);

      // Prepare to display the result in the 'picFound' album
      // Find the index of the 'picFound' album (may vary by language)
      this.ixFound = chalbs.indexOf('/' + this.z.picFound);
        // this.z.loli('picFound index = ' + this.ixFound + ' (cf. menu tree)', 'color:red');
      // -- Prepare counters and imgnames (inames) for all albums
      this.counts = '0'.repeat(chalbs.length + 1).split('').map(Number); // +1 for skipped
      this.inames = ' '.repeat(chalbs.length).split('');
      for (let i=0; i<paths.length; i++) {
        let chalb = paths[i].replace(/^[^/]+(.*)\/[^/]+$/, '$1'); // in imdbDirs format
        // -- Allow only files/pictures in the albums of #imdbDirs (chalbs):
        let okay0 = true;
        let idx = chalbs.indexOf(chalb);
        // Do not find images in
        if (idx > -1  && idx !== this.ixFound) {okay0 = true;} else {
          okay0 = false;
          idx = chalbs.length; // Count the dismissed/skipped, perhaps not further used?
        }
        this.counts[idx]++; // -- A hit in this album
        let fname = paths[i].replace(/^.*\/([^/]+$)/, '$1');
        if (idx < chalbs.length) {
          this.inames[idx] = (this.inames[idx] + ' ' + fname.replace(/\.[^./].*$/, '')).trim();
        }
        let linkfrom = '../' + paths[i].replace(/^[^/]*\//, '');
        let okay1 = this.z.acceptedFileName(fname);

        // n0=dirpath, n1=picname, n2=extension from 'paths'
        // -- 'paths' may accidentally contain illegal image file names, normally
        // silently ignored. If so, such names will be noticed by red #d00 color
        // (just an extra service). They may have been collected into the database
        // at regeneration and may occationally appear in this list.
        let n0 = paths[i].replace(/^(.*\/)[^/]+$/, '$1');
        if (!okay0) n0 = '<span style="color:#d00">' + n0 + '</span>';
        let n1 = fname.replace (/\.[^./]*$/, '');
        if (!okay1) n1 = '<span style="color:#d00">' + n1 + '</span>';
        let n2 = fname.replace(/(.+)(\.[^./]*$)/, '$2');
        if (okay0 && okay1) { // ▻🢒
            // console.log('i paths[i]',i,paths[i],okay0,okay1);
          //The 🢒 construct makes long broken entries easier to read:
          paths [i] = '🢒&nbsp;' + n0 + n1 + n2;
        } else {
            // console.log('i paths[i]',i,paths[i],okay0,okay1);
          paths[i] = '<span style="color:#d00">🢒&nbsp;</span>' + n0 + n1 + n2;
        }
        // -- In order to make possible show duplicates: Make the link names
        // unique by adding four random characters (r4) to the picname (n1),
        // equivalent with what is done in 'this.z.addRandom':
        let r4 = Math.random().toString(36).substr(2,4);
        fname = n1 + '.' + r4 + n2;
        if (filesFound < nLimit) {
          if (okay0 && okay1) { // Only approved files are counted as 'filesFound'
            filesFound++;
            nameOrder.push(n1 + '.' + r4 + ',0,0');
            let linkto = lpath + '/' + fname;
            // Arrange links of found pictures into the picFound album:
            this.commands.push ('ln -sf ' + linkfrom + ' ' + linkto);
          } else if (n1.length > 0) {
            paths [i] += '<span style="color:#000"> —&nbsp;visningsrättighet&nbsp;saknas</span>';
          }
          albs.push (paths [i]); // ..while all are shown
        } else filesFound++;
      }
      // 'nameOrder' will be the 'sortOrder' for 'picFound':
      nameOrder = nameOrder.join('§¤').trim ();
      nameOrder = nameOrder.replace(/§¤/g, '\\n');
      // nameOrder = '"' + nameOrder + '"';
        // this.z.loli('nameOrder:\n' + nameOrder, 'color:pink');
        // this.z.loli('commands:\n' + this.commands.join('\n'), 'color:pink');
        // this.z.loli('albs:\n' + albs.join('\n'), 'color:pink');
        // console.log('counts:', this.counts);
        // console.log('inames:', this.inames);

      // Prepare the alternative album list 'countAlbs' for the 'filesFound > nLimit' case:
      this.countAlbs = [];
      let keepOld = false;

      this.nchk = 0;
      this.keepIndex = [];
      for (let i=0; i<chalbs.length-1; i++) {
        if (this.counts [i]) {
          this.nchk += this.counts[i];
          this.keepIndex.push(i);
        }
      }
        // this.z.loli(this.keepIndex, 'color:red');

      // Clean the 'picFound' album
      let err = await this.z.execute('rm -rf ' + lpath + '/*');
        // this.z.loli(err, 'color:red');
      // Recreate the '.imdb' file
      await this.z.execute('touch ' + lpath + '/.imdb');

      // Create the sortOrder file with the found images. The 'echo' command
      // should or should not have the '-e' parameter (shell dependent, here not).
      // The within "" inclusion is important for the '\n' interpretation!
      await this.z.execute('echo "' + nameOrder + '" > ' + lpath + '/_imdb_order.txt');
    }
    this.z.closeDialog(dialogFindId);
    this.z.openDialog('dialogFindResult');
    // document.querySelector('#dialogFindResult').style.zIndex = Number(document.querySelector('#dialogFind').style.zIndex) + 1;
      // this.z.loli('Ignored: ' + this.counts[chalbs.length], 'color:lime');
      // this.z.loli('N, max: ' + this.nchk + ', ' + this.z.maxWarning, 'color:lime');
    let butt = document.querySelector('#dialogFindResult button.show');
    if (this.nchk > this.z.maxWarning) {
      this.z.alertMess(this.intl.t('write.maxWarning', {n: this.z.maxWarning}), 6);
      butt.setAttribute('disabled', '');
    } else if (this.nchk) butt.removeAttribute('disabled');
    if (!this.nchk) butt.setAttribute('disabled', '');

  }

  // openFound(-1) opens 'picFound' with all found images, while
  // openFound(i) opens 'picFound' with images found in album 'i'
  openFound = async (i) => {
    document.querySelector('img.spinner').style.display = '';
    let lpath = this.z.imdbPath + '/' + this.z.picFound; // The path to picFound
    // Clean up picFound:
    await this.z.execute('rm -rf ' + lpath + '/*');
    await this.z.execute('touch ' + lpath + '/.imdb');
    // await this.z.execute('touch ' + lpath + '/_imdb_order.txt');
    if (i < 0) {
      // Create links to all found images
      // for (let j=0; j<this.commands.length; j++) { // forwards
      for (let j=this.commands.length; j>0; j--) { // work backwards
        await this.z.execute(this.commands[j-1]);
      }
    } else {
      let sWhr = [false, false, false, false, true];
      // NOTE: The names and uses are mostly copied from 'doFindText' below.
      // 'this.inames[i]' are pic names, now to be found with exact match.
      // Simultaneously, will we find duplicate names, if any?
      // NO! WE WON'T! WHY DON'T WE FIND DUPLICATE NAMES???
      // The function 'z.searchText' code is in '#region search/' of z.
      let data = await this.z.searchText(this.inames[i], false, sWhr, -1);
      // Don't! Hide the spinner
      // document.querySelector('img.spinner').style.display = 'none';
      let paths = data.trim ().split ('\n');
        // console.log(paths);
      // for (let i=0; i<paths.length; i++) { // forwards
      for (let i=paths.length; i>0; i--) { // work backwards
        let linkfrom = '../' + paths[i-1].replace(/^[^/]*\//, ''); // make relative
        let fname = paths[i-1].replace(/^.*\/([^/]+$)/, '$1'); // clean from directories
        // Make a four character random 'intrusion' in the file name
        fname = this.z.addRandom(fname)
        let linkto = lpath + '/' + fname; // absolute path
        // Create a link to this found image
        let command = 'ln -sf ' + linkfrom + ' ' + linkto;
        await this.z.execute(command);
      }
    }
    this.z.closeDialog(dialogFindId);
    this.z.openAlbum(this.ixFound);
  }

  openAlbumMark = async (i) => {
    this.z.openAlbum(i);

    // Allow for the rendering of mini images and preload of view images
    let size = this.z.albumAllImg(i);
    await new Promise (z => setTimeout (z, size*120 + 100));

    let names = this.inames[i].split(' ');
    for (let j=0;j<names.length;j++) {
      // this.z.markBorders(names[j]);
      this.z.gotoMinipic(names[j]);
    }
  }

  <template>
    <div style="display:flex" {{on 'keydown' this.detectEscClose}}>

      <dialog id="dialogFind" style="width:min(calc(100vw - 1rem),650px);z-index:14">
        <header data-dialog-draggable >
          <p>&nbsp;</p>
          <p><b>{{t 'dialog.find.header'}}</b> <span style="color:#080">
            {{t 'dialog.find.nolinks'}}</span></p>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog dialogFindId)}}>×</button>
        </header>
        <main>
          <div class="diaMess">
            <b style="display:block;max-width:660px;text-align:center;color:brown"></b>
            <VirtualKeys />
          </div>

          <textarea id="srchTxt" name="searchtext" placeholder="{{t 'write.searchTerms'}}" autofocus="true" style="width:calc(100% - 8px)" rows="4" {{on 'mouseleave' onMouseLeaveTextarea}}></textarea>

          <div class="diaMess">
            <div class="edWarn" style="font-weight:normal;text-align:right"></div>
            <div class="srchIn"> {{t 'write.find0'}}&nbsp;
              <span class="glueInline">
                <input id="t1" name="search1" value="description" checked="" type="checkbox">
                <label for="t1">&nbsp;{{t 'write.find1'}}</label>&nbsp;
              </span>
              <span class="glueInline">
                <input id="t2" name="search2" value="creator" checked="" type="checkbox">
                <label for="t2">&nbsp;{{t 'write.find2'}}</label>&nbsp;
              </span>
              <span class="glueInline" style="display:{{this.searchNotes}}">
                <input id="t3" name="search3" value="source" type="checkbox">
                <label for="t3">&nbsp;{{t 'write.find3'}}</label>&nbsp;
              </span>
              <span class="glueInline">
                <input id="t4" name="search4" value="album" checked="" type="checkbox">
                <label for="t4">&nbsp;{{t 'write.find4'}}</label>&nbsp;
              </span>
              <span class="glueInline">
                <input id="t5" name="search5" value="name" checked="" type="checkbox">
                <label for="t5">&nbsp;{{t 'write.find5'}}</label>
              </span>
            </div>
            <div class="orAnd">{{t 'write.find6'}} &nbsp; &nbsp;
                <a class="hoverDark" style="font-family:sans-serif;font-variant:all-small-caps" tabindex="-1" {{on 'click' (fn this.z.toggleDialog 'dialogFindHelp')}}>{{t 'searchHelp'}}</a>
              <br>{{t 'write.find7'}}<br>
              <span class="glueInline">
                <input id="r1" name="searchmode" value="AND" checked="" type="radio">
                <label for="r1">{{{t 'write.find8'}}}</label>
              </span>&nbsp;
              <span class="glueInline" style="padding-bottom:0.5rem">
                <input id="r2" name="searchmode" value="OR" type="radio">
                <label for="r2">{{{t 'write.find9'}}}</label>
              </span>
            </div>
          </div>

        </main>
        <footer data-dialog-draggable>
          <button type="button" {{on 'click' (fn this.doFindText)}}>{{t 'button.findIn'}} <b>{{this.z.imdbRoot}}</b></button>&nbsp;
          <button type="button" {{on 'click' (fn this.z.closeDialog dialogFindId)}}>{{t 'button.close'}}</button>&nbsp;
        </footer>
      </dialog>

      <dialog id="dialogFindHelp" style="width:min(calc(100vw - 2rem),450px)">
        <header data-dialog-draggable>
          <p>&nbsp;</p>
          <p>{{t 'write.findHelpHeader'}} <span style="color:#080">{{t 'write.findHelpHeader1'}}</span></p>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogFindHelp')}}>×</button>
        </header>
        <main style="padding:0 0.5rem 0 1rem;height:20rem" width="99%">

          <p style="padding-top:0.3em"><strong>{{{t 'write.findHelp0'}}}</strong> <br> </p>
          <p>
            {{{t 'write.findHelp1'}}}
          </p>
          <p>
            {{{t 'write.findHelp2'}}}
          </p>
          <p>
            {{{t 'write.findHelp3'}}}
          </p>
          <p>
            {{{t 'write.findHelp4'}}}
          </p>
          <p>
            {{{t 'write.findHelp5'}}}
          </p>
          <p>
           {{{t 'write.findHelp6'}}}
          </p>

        </main>
        <footer data-dialog-draggable>
          <button type="button" {{on 'click' (fn this.z.closeDialog 'dialogFindHelp')}}>{{t 'button.close'}}</button>&nbsp;
        </footer>
      </dialog>

      <dialog id="dialogFindResult" style="max-width:calc(100vw - 2rem);z-index:13">
        <header data-dialog-draggable>
          <p>&nbsp;</p>
          <p>{{{t 'write.findResultHeader' n=this.nchk c=this.z.imdbRoot}}}</p>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogFindResult')}}>×</button>
        </header>
        <main style="line-height:180%;border-bottom:1px solid black;padding-left:1rem">
          {{#if this.nchk}}
            <span>{{{t 'chooseShow' f=this.albumFound}}}<br></span>
          {{else}}
            <span style="color:blue"><b>{{t 'write.noneFound'}}</b></span>
          {{/if}}
        </main>
        <main style="padding:0 0.5rem 0.5rem 1rem;height:auto;line-height:150%;overflow:auto" width="99%">

          {{#if this.nchk}}
            {{#each this.keepIndex as |i|}}

              <a class="hoverDark" style="text-decoration:none"
              {{on 'click' (fn this.openFound i)}}>
                {{{this.count i}}} &nbsp;&nbsp;{{t 'in'}}&nbsp;&nbsp; {{this.z.imdbRoot}}{{this.album i}}
              </a> &nbsp;&nbsp;&nbsp;&nbsp;

              <a class="hoverDark" style="font-family:Arial,Helvetica,sans-serif;font-size:70%;font-variant:small-caps;text-decoration:none"
              {{on 'click' (fn this.openAlbumMark i)}}>
                {{t 'allInAlbum'}}
              </a><br>

            {{/each}}
          {{/if}}

          <button class="show" type="button" {{on 'click' (fn this.openFound -1)}}>
            {{t 'button.show'}} <b>{{{this.albumFound}}}</b></button>

        </main>
        <footer data-dialog-draggable>
          <button type="button" {{on 'click' (fn this.z.closeDialog 'dialogFindResult')}}>
            {{t 'button.close'}}</button>&nbsp;
        </footer>
      </dialog>

    </div>

  </template>
}

//== Virtual keys for some missing characters on common keyboards
// (some are due to the included languages)

const VirtualKeys = <template>
  <div class="" style="text-align:left;padding:0.1em">
    <b class='insertChar' {{on 'click' insert}}>×</b>
    <b class='insertChar' {{on 'click' insert}}>°</b>
    &nbsp;
    &nbsp;
    <b class='insertChar' {{on 'click' insert}}>–</b>
    <b class='insertChar' {{on 'click' insert}}>—</b>
    &nbsp;
    &nbsp;
    <b class='insertChar' {{on 'click' insert}}>„</b>
    <b class='insertChar' {{on 'click' insert}}>“</b>
    <b class='insertChar' {{on 'click' insert}}>”</b>
    &nbsp;
    &nbsp;
    <b class='insertChar' {{on 'click' insert}}>‚</b>
    <b class='insertChar' {{on 'click' insert}}>‘</b>
    <b class='insertChar' {{on 'click' insert}}>’</b>
    &nbsp;
    &nbsp;
    <b class='insertChar' {{on 'click' insert}}>»</b>
    <b class='insertChar' {{on 'click' insert}}>«</b>
    &nbsp;
    &nbsp;
    <b class='insertChar' {{on 'click' insert}}>›</b>
    <b class='insertChar' {{on 'click' insert}}>‹</b>
  </div>
</template>

var textArea = '';
var insertInto = '';

// Detect last active textarea
// Used when a VirtualKeys key is clicked

function onMouseLeaveTextarea(/*e*/) {
  //textArea = e.target;
  textArea = document.activeElement;
  insertInto = textArea.id;
}

// Insert from VirtualKeys, non-replacing(!)

export function insert(e) {
  if (!insertInto) return;

  textArea = document.getElementById(insertInto);

  let textValue = textArea.value;

  if (textValue === undefined) return;

  let beforeInsert = textValue.substring(
    0, textArea.selectionStart);
  let afterInsert = textValue.substring(
    textArea.selectionStart, textArea.length);
  // Avoid 'delete selected', cannot undo!
  // let afterInsert = textValue.substring(
  //   textArea.selectionEnd, textArea.length);
  // selectedText = textValue.substring(
  //   textArea.selectionStart, textArea.selectionEnd);

  beforeInsert += e.target.innerHTML;
  textValue = beforeInsert + afterInsert;
  document.getElementById(insertInto).value = textValue;
  document.getElementById(insertInto).focus();

  let i = beforeInsert.length;

  if (textArea.setSelectionRange) { // avoid error in some special cases
    textArea.setSelectionRange(i, i);
    beforeInsert = textValue.substring(
      0, textArea.selectionStart);
    afterInsert = textValue.substring(
      textArea.selectionEnd, textArea.length);
  }
}
