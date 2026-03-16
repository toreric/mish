//== Mish dialog for various purposes

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { cached } from '@glimmer/tracking';

import RefreshThis from './refresh-this';

import { UploadFile } from 'ember-file-upload';
import FileQueueService from 'ember-file-upload/services/file-queue';
import fileQueue from 'ember-file-upload/helpers/file-queue';

export const dialogUtilId = 'dialogUtil';
const LF = '\n';
// var fileList;
// var fileNames;
// var passedFiles;

// const queue = this.fileQueue.find('your-queue-name');

export class DialogUtil extends Component {
  @service('common-storage') z;
  @service intl;
  @service fileQueue;

  @tracked tool = ''; // utility tool id
  @tracked countImgs = 0; // duplicate image name counter
  @tracked amTools = 0; // album tools flag
  @tracked cnTools = 0; // common tools flag
  @tracked resRad = 0; // to trigger rerender/reset of radio buttons

  @tracked nFail = 0; // no of illegal file(name)s
  @tracked nPass = 0; // no of passed files

  // @action
  // async uploadPhoto(file) {
uploadPhoto = async (file) => {
  try {
    const response = await file.upload('/uploads/', {accepts: ['image/png', 'image/jpeg', 'image/tiff', 'image/gif'], fileKey: 'file'});
  } catch (res) {
    console.log(res);
    console.error(`File upload failed: ${res}`);
  }
}

// uplFiles = async (queue) => {
//   console.log(queue.files[0]);
//   let i = 0;
//   // await Promise.all(queue.files.map((file) => {
//   if (queue.length > 0) {
//     let file = queue.files[0];
//     console.log(i, queue.files[0]);
//     file.upload('/uploads', {accepts: ['image/png', 'image/jpeg', 'image/tiff', 'image/gif'], fileKey: 'file'}); // fileKey default is 'file'
//     queue.files[0].remove;
//     i++
//   };
// }
// const results = await Promise.all(queue.files.map((file) => {
//   return file.upload('/path/to/your/upload/endpoint/', { YourOptions });
// })) ?? [];

  // get queue() {
  //   return this.fileQueue.findOrCreate('photos');
  // }

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      if (document.getElementById(dialogUtilId).open) this.closeDialogUtil();
    }
  }

  // Detect
  detectMouseDown = (e) => {
    e.stopPropagation();
  }

  // Detect
  detectMouseUp = (e) => {
    e.stopPropagation();
  }

  // Which tool was selected?
  detectRadio = async (e) => {
    var elRadio = e.target;
      // this.z.loli(`${elRadio.id} ${elRadio.checked}`, 'color:red');
    this.tool = elRadio.id;
    if (this.tool === 'util3') this.z.displayNames = 'block'; //sort by name
  }

  clearInput = (id) => {
    let elem = document.getElementById(id);
    elem.value = '';
    elem.style.background = '#f0f0a0';
    elem.focus();
  }

  get imdbDirName() {
  // imdbDirName = () => {
    let tmp = this.z.imdbDirName;
    return this.z.handsomize2sp(tmp);
  }

  // This button is inserted into alertMess when browser reload is required.
  // Then alertMess cannot be closed by closeDialog (but with closeDialogs!).
  get restart() {
    return '<br><div style="text-align:center"><button class="unclosable" type="button" onclick="location.reload(true);return false">' + this.intl.t('button.restart') + '</utton></div>'
  }

  // Album tools
  get okDelete() { // true if delete album is allowed
      // this.z.loli('imdbDir: ' +  this.z.imdbDir.slice(1), 'color:yellow');
      // this.z.loli('picFound: ' +  this.z.picFound, 'color:yellow');
    let found = this.z.imdbDir.slice(1) === this.z.picFound;
    if (this.z.albumTools && !found && this.z.allow.albumEdit && this.z.imdbDir) { // Don't erase ''=root
      this.tool = '';
      return true
    } else {
      return false;
    }
  }

  get okTextSheet() { // true if images shown
      // this.z.loli('numShown ' + this.z.numShown, 'color:brown ');
    if (this.z.albumTools && this.z.numShown > 0) {
      this.tool = '';
      return true;
    } else {
      return false;
    }
  }

  get okSubalbum() { // true if subalbums allowed
    if (this.z.albumTools && this.z.imdbDir.slice(1) !== this.z.picFound && this.z.allow.albumEdit) {
      this.tool = '';
      return true;
    } else {
      return false;
    }
  }

  get okSort() { // true if sorting by name is possible
    if (this.z.albumTools && this.z.numShown > 1) {
      this.tool = '';
      return true;
    } else {
      return false;
    }
  }

    get okUpload() {
      if (this.z.albumTools && this.z.imdbDir.slice(1) !== this.z.picFound && this.z.allow.deleteImg) {
        this.tool = '';
        return true;
      } else {
        return false;
      }
    }

  get okSeeFavorites() {
    if (this.z.albumTools) {
      return false;
    } else {
      this.tool = '';
      return true
    }
  }

  get okDupNames() {
    if (this.z.albumTools) {
      return false;
    } else {
      this.tool = '';
      return true
    }
  }

  get okDupImages() {
    if (this.z.albumTools) {
      return false;
    } else {
      this.tool = '';
      return true;
    }
  }

  get okDbUpdate() {
    if (this.z.albumTools && this.z.allow.textEdit) {
      return false;
    } else {
      this.tool = '';
      return true;
    }
  }

  get notEmpty() { // true if the album is not empty
    return this.z.subaIndex.length > 0 || this.z.numImages > 0;
  }

  // Album tools
  doDelete = async () => { // Delete an empty album
    // this.z.alertMess(this.intl.t('futureFacility'));
    let cmd = 'rm -rf ' + this.z.imdbPath + this.z.imdbDir;
      // this.z.loli(cmd, 'color:red');
    let msg = await this.z.execute(cmd);
    if (msg) {
      // failure is really not possible with 'rm -rf ...'
      this.z.loli(this.z.imdbRoot + this.z.imdbDir + ': delete failed', 'color:red');
    } else {
      this.z.loli(this.z.imdbRoot + this.z.imdbDir + ' deleted', 'color:lightgreen');
      this.z.alertMess(this.z.imdbRoot + this.z.imdbDir + ' ' + this.intl.t('deleted') + this.intl.t('write.reloadRequired') + this.restart);
    }
  }

  doSort = async () => {
    document.querySelector('img.spinner').style.display = '';
    let minis = document.querySelectorAll('div.miniImgs.imgs div.img_mini');
    let names = [];
    for (let minisi of minis) {
      names.push(minisi.id.slice(1));
    }
      // this.z.loli(LF + names.join(LF), 'color:yellow');
    // Sort example: a.sort((a,b) => {return a.value - b.value});
    // Applied to text, exact conformity should also consider equality
    // using a more accurate function that correspondingly returns 1, 0, or -1:
    names.sort((a, b) => {
      let x = a.toLowerCase();
      let y = b.toLowerCase();
      if (x < y) return -1;
      if (x > y) return 1;
      return 0;
    })
    // The id for reverse sort radio button is 'util32' (see template)
    if (document.getElementById('util32').checked) names.reverse();
      // this.z.loli(LF + names.join(LF), 'color:yellow');

    // When you add an element that is already in the DOM,
    // this element will be moved, not copied.
    let wrap = document.getElementById('imgWrapper');
    for (let i=0;i<minis.length;i++) {
      wrap.appendChild(document.getElementById('i' + names[i]));
    }
    this.z.closeDialogs(); // Why this?
    await new Promise (z => setTimeout (z, 399)); // doSort
    document.querySelector('img.spinner').style.display = 'none';
    this.z.alertMess(this.z.intl.t('write.afterSort')); // TEMPORARY
    this.z.displayNames = 'block';
  }

  doSubalbum = async (n) => {
    let elem = document.getElementById('newAlbNam');
    let name = elem.value;
    // Buttons 'continue' and 'make-album'
    let bucont = document.querySelector('#newAlbNam + a + br + button');
    let bumake = document.querySelector('#newAlbNam + a + br + button + button');
    elem.focus();
    if (n === 1) { // continue
      name = name.trim().replace(/ +/g, '_');
      elem.value = name;
      if (name && this.z.acceptedDirName(name)) {
        elem.style.background = '#dfd'; // green
        bucont.disabled = true;
        bumake.disabled = false;
      } else {
        elem.style.background = 'pink'; // reddish
        bumake.disabled = true;
      }
    }
    if (n > 1) { // reset
      bucont.disabled = false;
      bumake.disabled = true;
      elem.style.background = '#f0f0a0'; // yellow
      if (n === 3) { // make
        let pathNew = this.z.imdbPath + this.z.imdbDir;
        let nameNew = '/' + document.getElementById('newAlbNam').value;
        let cmd = 'mkdir ' + pathNew + nameNew + ' && touch ' + pathNew + nameNew + '/.imdb';
            // this.z.loli(cmd, 'color:red');
        let msg = await this.z.execute(cmd);
        if (msg) {
          // don't show msg: reveals paths
          let mayExist = this.intl.t('mayExist');
          this.z.loli(this.z.imdbRoot + this.z.imdbDir + nameNew + ' not created ' + mayExist, 'color:red');
          this.z.alertMess(this.z.imdbRoot + this.z.imdbDir + nameNew + ' ' + this.intl.t('createfail') + ' ' + mayExist);
        } else {
          this.z.loli(this.z.imdbRoot + this.z.imdbDir + nameNew + ' created', 'color:lightgreen');
          this.z.alertMess(this.z.imdbRoot + this.z.imdbDir + nameNew + ' ' + this.intl.t('created') + this.intl.t('write.reloadRequired') + this.restart);
        }
      }
    }
  }

  doTextSheet = () => {
    this.z.futureNotYet('write.tool8');
  }

  /*doUpload = async (select) => {
    if (select) {
      var that = this;
      this.nPass = 0;
      this.nFail = 0;
      var preview = [];
      var goodf = [];
      fileList = [];
      fileNames = [];
      passedFiles = [];
      var filcodis = ''; //color display
      let tmp = document.getElementById('uplCand');
      // await new Promise (z => setTimeout (z, 549));
      if (tmp) { // when the dialog is rendered
        tmp.innerHTML = '';
        let imUpLd;
        imUpLd = document.createElement('input');
        imUpLd.type = 'file';
        imUpLd.multiple = true;
        imUpLd.accept = 'image/png,image/jpeg,image/tiff,image/gif';

        let handleFiles = async () => {
          fileList = imUpLd.files;
            console.log(fileList);
            const selectedFiles = [...imUpLd.files];
            console.log(selectedFiles);
          this.z.loli(' After download', 'color:red');
          for (let i=0;i<fileList.length;i++) {
            let f = fileList[i];
            // this.z.loli(f.type, 'color:pink');

            preview[i] = URL.createObjectURL(f);
            // Initial 'vbm' or 'cpr' (case ignored) in
            // file names MUST NOT be investigated here:
            goodf.push(that.z.acceptedFileName(f.name)); // boolean
          }
          if (fileList) {
            for (let i=0; i<fileList.length; i++) {
              let back = goodf[i] ? '"' : ' style="background:pink"';
              let mipi = goodf[i] ? ' <img class="flexEnd" src="' + preview[i] + '" style="background:#fff" height="32">':'<div class="flexEnd">' + that.intl.t('nameError') + '</div>';
              // TIFF special:
              if (goodf[i] && fileList[i].type === 'image/tiff') {
                // goodf[i] = false;
                back = ' style="background:#ffc"'; //yellowish
                // mipi = '&nbsp;<button type="button" style="margin:0;border:0;height:90%"><b>?</b></button>';
              }
              filcodis += '<div class="uplFiles"' + back + '><b>' + fileList[i].name + '</b><div>(' + fileList[i].type + ')</div>' + mipi + '</div>';
              if (goodf[i]) {
                  // that.z.loli(fileList[i].name, 'color:#dfd');
                passedFiles.push(fileList[i]);
                fileNames.push(fileList[i].name);
                that.nPass ++;
                // URL.revokeObjectURL(fileList[i]);
                document.querySelector('button.up1').style.display = 'none';
                document.querySelector('button.up2').style.display = '';
              } else {
                  // that.z.loli(fileList[i].name, 'color:pink');
                that.nFail ++;
              }
            }

            let tiffImg = (tiffName, e) => {
              if (e) e.stopPropagation();
              // this.z.alertMess(this.intl.t(''));
              this.z.alertMess(tiffName + ' &nbsp; är en bildfil av typ image/tiff som är godkänd,\nmen som måste kopieras till albumet manuellt\n\n(Det kan komma att ändras i framtiden)');
            }

            document.getElementById('uplCand').innerHTML = filcodis;
            await new Promise (z => setTimeout (z, fileList.length*20 + 50)); // handleFiles1
            let imgLine = document.querySelectorAll('#uplCand .uplFiles');
              console.log(imgLine); // Ok!
            document.querySelector('img.spinner').style.display = 'none';
            if (that.nPass === 0) {
              document.querySelector('button.up1').style.display = 'none';
              document.querySelector('button.up2').style.display = 'none';
              document.querySelector('button.up3').innerHTML = 'Please cancel and redo!';
            }
            that.z.loli('nPass=' + that.nPass + ' nFail=' + that.nFail, 'color:red');
            await new Promise (z => setTimeout (z, fileList.length*20 + 50)); // handleFiles2
            // for (let i=0; i<fileList.length; i++) {
            //   if (fileList[i].type === 'image/tiff') {
            //     imgLine[i].querySelector('button')
            //       .addEventListener('mouseup', tiffImg(fileList[i].name));
            //       console.log(fileList[i], imgLine[i]);
            //   }
            // }
          }
        }

        let cancelUpload = () => {
          document.querySelector('img.spinner').style.display = 'none';
          return;
        }

        await new Promise (z => setTimeout (z, 99)); // doUpload

        imUpLd.addEventListener('change', handleFiles, false);
        imUpLd.addEventListener('cancel', cancelUpload, false);
        imUpLd.click();
        document.querySelector('img.spinner').style.display = '';
          this.z.loli('Before download', 'color:red');
        imUpLd.remove();
        for (const f of fileList) URL.revokeObjectURL(f);
          // this.  z.futureNotYet('write.tool5'); // TO BE REMOVED
      }
    } else {
        // File instances are also valid Blobs (e.g. passedFiles)
        console.log(passedFiles);
        for (let f of passedFiles) {
          this.z.loli(f.name + ' ' + f.type, 'color:red');
        }
      document.getElementById('commonTools').click(); // closes the component
      if (this.nPass > 0) await this.z.upload(passedFiles);
      if (!this.nPass) this.z.loli('no file accepted', 'color:red');
      else if(this.nPass === 1) this.z.loli('one file accepted', 'color:lightgreen');
      else this.z.loli(this.nPass + ' files accepted', 'color:lightgreen');
    }
  } */

  // Common tools
  doDupNames = async () => {
      // return new Promise (async function (resolve, reject) {
    document.querySelector('img.spinner').style.display = '';
    this.z.closeDialog('dialogUtil');
    // let path = this.z.imdbPath + this.z.imdbDir;
    let path = this.z.imdbPath; //OVERRIDE! I.e. search all albums.
    try { // Start try
      let duplist = await this.z.execute('finddupnames 2 ' + path);
        // this.z.loli(LF + duplist, 'color:brown');
      let paths = duplist.toString().trim().split(LF);
        // this.z.loli('"'+paths[0]+'"', 'color:red');
      if (paths.length === 1 && paths[0].length === 0) paths = [];
        // this.z.loli('paths:', 'color:deeppink');
        // console.log(paths);
      this.countImgs = paths.length;
      let lpath = this.z.imdbPath + '/' + this.z.picFound; // The path to picFound
      // Clean up picFound
      await this.z.execute('rm -rf ' + lpath + '/*');
      await this.z.execute('touch ' + lpath + '/.imdb');
      for (let i=paths.length; i>0; i--) { // work backwards
        let linkfrom = '../' + paths[i-1].replace(/^[^/]*\//, ''); // make relative
        let fname = paths[i-1].replace(/^.*\/([^/]+$)/, '$1'); // clean from directories
        // Make a four character random 'intrusion' in the file name
        fname = this.z.addRandom(fname);
          // this.z.loli(fname, 'color:red');
        let linkto = lpath + '/' + fname; // absolute path
        // Create a link to this found image
        let command = 'ln -sf ' + linkfrom + ' ' + linkto;
          // this.z.loli(command, 'color:red');
        await this.z.execute(command);
      }
      this.z.openDialog('dialogDupResult');
      document.querySelector('img.spinner').style.display = 'none';
    } catch (err) {
      console.error('doDupNames of DialogUtil:', err.message);
    } // End try
      // }) // End promise
      // The Promise way makes 'async' superfluous but hides 'this'
  }
  doDupNamesShow = async () => {
    document.querySelector('img.spinner').style.display = '';
    this.z.openAlbum(this.z.picFoundIndex);
    this.z.closeDialog('dialogDupResult');
    await new Promise (z => setTimeout(z, this.countImgs*50 + 99)); // doDupNamesShow
    this.z.displayNames = 'block';
    document.querySelector('img.spinner').style.display = 'none';
  }

  doDupImages = () => {
    this.z.futureNotYet('write.tool7');
  }

  doDbUpdate = async () => {
    document.querySelector('img.spinner').style.display = '';
    let cmd = './ld_imdb.js -e ' + this.z.imdbPath;
      // this.z.loli(cmd, 'color:red');
    await this.z.execute(cmd);
    document.querySelector('img.spinner').style.display = 'none';
    this.z.loli('updated text database');
    this.z.alertMess(this.intl.t('write.dbUpdated'));
  }

  // doFindText = () => {
  //   this.z.closeDialog('dialogUtil');
  //   this.z.doFindText();
  // }

  get resetRadio() { // trigger
    this.resRad ++;
    return '';
  }

  get zeroTools1() {
    this.amTools = 0;
    return '';
  }

  get addTools1() {
    this.amTools ++;
    return '';
  }

  get zeroTools2() {
    this.cnTools = 0;
    return '';
  }

  get addTools2() {
    this.cnTools ++;
    return '';
  }

  // This kind of ”cross-close” by toggle-close causes, by
  // coincidence, reset of ALL the dialog's radio buttons.
  // NOTE: Doesn't work formally at direct manual ”non-cross”
  // tool toggle when a radio button is selected.
  // The two variants of the tool dialog made this possible.
  closeDialogUtil = () => {
    // It is an 'reset-radio-buttons' advantage to toggle(close)
    // with the other alternative button, if avaliable:
    let album = document.getElementById('albumTools');
    let common = document.getElementById('commonTools');
    if (this.z.albumTools && common) common.click();
    else if (album) album.click();
    // If still open (may happen with an absent button) then the
    // last used will, but'only formally', remain selected):
    this.z.closeDialog('dialogUtil');
  }

  // NOTE, within the <template></template>:
  // *** The utility numbering is not always in sequence ***

  <template>

    <dialog id="dialogUtil" style="width:min(calc(100vw - 2rem),auto);max-width:480px" {{on 'keydown' this.detectEscClose}} {{on 'mousedown' this.detectMouseDown}} {{on 'mouseup' this.detectMouseUp}}>
      <header data-dialog-draggable>

        {{!-- Placeholder for
        display:flex;justify-content:space-between --}}
        <p>&nbsp;</p>

        {{#if this.z.albumTools}}
          {{!-- Album tools --}}
          <p><b>{{t 'write.utilHeader'}} <span>{{this.imdbDirName}}</span></b><br>({{this.z.imdbRoot}}{{this.z.imdbDir}})</p>
        {{else}}
          {{!-- Common tools --}}
          <p><b>{{t 'write.utilHeader0'}} <span>{{this.z.imdbRoot}}</span></b></p>
        {{/if}}

        <button class="close" type="button" {{on 'click' this.closeDialogUtil}}>×</button>

      </header>
      <main style="padding:0 0.75rem;max-height:24rem" width="99%">

        <RefreshThis @for={{this.resRad}}>
        <div style="padding:0.5rem 0;line-height:1.4rem">
        {{#if this.z.albumTools}}
        {{!-- Album tools --}}{{this.zeroTools1}}

          {{!-- Here are tools specific for the actual album --}}
          {{{t 'write.tool0' a=this.imdbDirName}}}<br>

          {{#if this.okDelete}}
            <span class="glue">
              <input id="util1" {{this.addTools1}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util1"> &nbsp;{{t 'write.tool1'}}</label>
            </span>
          {{/if}}
          {{#if this.okTextSheet}}
            <span class="glue">
              <input id="util8" {{this.addTools1}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util8"> &nbsp;{{{t 'write.tool8'}}}</label>
            </span>
          {{/if}}
          {{#if this.okSubalbum}}
            <span class="glue">
              <input id="util2" {{this.addTools1}} name="albumUtility" type="radio" autofocus {{on 'click' (fn this.detectRadio)}}>
              <label for="util2"> &nbsp;{{t 'write.tool2'}}</label>
            </span>
          {{/if}}
          {{#if this.okSort}}
            <span class="glue">
              <input id="util3" {{this.addTools1}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util3"> &nbsp;{{t 'write.tool3'}}</label>
            </span>
          {{/if}}
          {{#if this.okUpload}}
            <span class="glue">
              <input id="util5" {{this.addTools1}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util5"> &nbsp;{{t 'write.tool5'}}</label>
            </span>
          {{/if}}

        {{else}}
        {{!-- Common tools --}}{{this.zeroTools2}}

          {{!-- Here are tools for the entire album collection --}}
          <div style="margin:0.5rem 0 0 0">{{{t 'write.tool01'}}}</div>
          {{#if this.okSeeFavorites}}
            <span class="glue">
              <input id="util91" {{this.addTools2}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util91"> &nbsp;{{t 'write.tool91'}}</label>
            </span>
          {{/if}}
          {{#if this.okDupNames}}
            <span class="glue">
              <input id="util4" {{this.addTools2}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util4"> &nbsp;{{t 'write.tool4'}}</label>
            </span>
          {{/if}}
          {{#if this.okDupImages}}
            <span class="glue">
              <input id="util7" {{this.addTools2}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util7"> &nbsp;{{{t 'write.tool7'}}}</label>
            </span>
          {{/if}}
          {{#if this.okDbUpdate}}
            <span class="glue">
              <input id="util6" {{this.addTools2}} name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
              <label for="util6"> &nbsp;{{t 'write.tool6'}}</label>
            </span>
          {{/if}}

        {{/if}}
        </div>

        <div style="padding:0.5rem 0">

          {{#if this.z.albumTools}}
            {{#if this.amTools}}
              {{!-- {{t 'write.chooseTool'}}<br> --}}
            {{else}}
              {{t 'write.tool99'}}
            {{/if}}
          {{else}}
            {{#if this.cnTools}}
              {{!-- {{t 'write.chooseTool'}}<br> --}}
            {{else}}
              {{t 'write.tool99'}}
            {{/if}}
          {{/if}}

          {{!-- === Delete the album === --}}
          {{#if (eq this.tool 'util1')}}
              <b>{{t 'write.tool1'}}</b>
            {{#if this.notEmpty}}
              <br><span style="color:blue">{{t 'write.notEmpty'}}</span>
            {{else}}
              – {{t 'write.isEmpty'}}<br>
              <button type="button" {{on 'click' (fn this.doDelete)}}>{{{t 'button.delete' name=this.imdbDirName}}}</button>
            {{/if}}

          {{!-- === Make text list === --}}
          {{else if (eq this.tool 'util8')}}

              <button type="button" {{on 'click' (fn this.doTextSheet)}}>{{{t 'write.tool8' a=this.imdbDirName}}}</button>

          {{!-- === Make a new subalbum === --}}
          {{else if (eq this.tool 'util2')}}
            <b>{{t 'write.tool2'}}</b><br>

            <input id="newAlbNam" type="text" class="cred user nameNew" size="36" title="" placeholder="{{t 'write.albumName'}}" style="margin:0.2rem 0 0.5rem 0" {{on 'keydown' (fn this.doSubalbum 2)}} autofocus autocomplete="off"><a title={{t 'erase'}} {{on 'click' (fn this.clearInput 'newAlbNam')}}> ×&nbsp;</a><br>

            <button type="button" {{on 'click' (fn this.doSubalbum 1)}}>{{t 'button.continue'}}</button>
            <button type="button" {{on 'click' (fn this.doSubalbum 3)}} disabled>{{t 'button.dosub'}}</button>

          {{!-- === Sort images by names === --}}
          {{else if (eq this.tool 'util3')}}
            <b>{{t 'write.tool3'}}</b><br>

            <button type="button" {{on 'click' (fn this.doSort)}}>{{t 'write.tool3'}}</button>

            <form style="line-height:1.35rem">
              <span class="glue">
                <input id="util31" name="albumUtility" type="radio" checked>
                <label for="util31"> &nbsp;{{t 'write.tool31'}}</label>
              </span>
              <span class="glue">
                <input id="util32" name="albumUtility" type="radio">
                <label for="util32"> &nbsp;{{t 'write.tool32'}}</label>
              </span>
            </form>

          {{!-- === Find duplicate image names === --}}
          {{else if (eq this.tool 'util4')}}
            <b>{{t 'write.tool4'}}</b><br>

            {{!-- {{#if this.z.imdbDir}} subtree OVERRIDE!
              <button type="button" {{on 'click' (fn this.doDupNames)}}>{{{t 'write.tool41' a=this.imdbDirName}}}</button>
            {{else}} root --}}
              <button type="button" {{on 'click' (fn this.doDupNames)}}>{{{t 'write.tool42'}}}</button>
            {{!-- {{/if}} --}}

          {{!-- === Find duplicate images === --}}
          {{else if (eq this.tool 'util7')}}

              <button type="button" {{on 'click' (fn this.doDupImages)}}>{{{t 'write.tool7' a=this.imdbDirName}}}</button>

          {{!-- === Upload images === --}}
          {{else if (eq this.tool 'util5')}}
            {{!-- <span style="display:none">{{this.doUpload true}}</span> --}}

            <b title-2="{{t 'fileNameRules'}}" style="width:100%">{{t 'write.tool5'}}</b> <br><br><br><br><br>

            {{#let (fileQueue name='photos' onFileAdded=this.uploadPhoto) as |queue|}}

            {{!-- {{#let (fileQueue name='photos') as |queue|}} --}}

            {{!-- <form action="/uploads/" enctype="multipart/form-data" method="post" onsubmit="return false"> --}}
              <label>Choose files
                <input id="imUpLd" type="file" multiple name="uploaded_file">
                {{!-- <input id="imUpLd" type="file" name="uploaded_file"> --}}
              </label><br>
              Files in queue: {{queue.files.length}}<br>
              {{t 'filesPassed' n=this.nPass}}<br>
              {{t 'filesFailed' n=this.nFail}}<br>
              <button type="submit">upload</button>
            {{!-- </form> --}}

            {{/let}}

            {{!-- <button class="up1" type="button" {{on 'click' (fn this.doUpload true)}}>{{t 'write.tool51'}}</button>
            <button class="up2" type="button" {{on 'click' (fn this.doUpload false)}} style="display:none">{{t 'button.continue'}} {{t 'filesProceed'}}</button>
            <button class="up3" type="button" {{on 'click' this.closeDialogUtil}}>{{t 'button.cancel'}}</button> --}}

            <form style="line-height:1.35rem">
              <span class="glue">
                <input id="util51" name="albumUtility" type="radio" checked>
                <label for="util51"> &nbsp;{{t 'placeFirst'}}</label>
              </span>
              <span class="glue">
                <input id="util52" name="albumUtility" type="radio">
                <label for="util52"> &nbsp;{{t 'placeLast'}}</label>
              </span>
            </form>

            {{!-- List of upload-candidates --}}

            <div id="uplCand" style="width:auto"></div>

          {{!-- === Update search data for the entire album collection === --}}
          {{else if (eq this.tool 'util6')}}

            <button type="button" {{on 'click' (fn this.doDbUpdate)}}>{{t 'write.tool6'}}</button>

          {{!-- === Manage personal favorites === --}}
          {{!-- Tip: util9 is free to replace util91 --}}
          {{else if (eq this.tool 'util91')}}

            <button type="button" {{on 'click' (fn this.z.futureNotYet 'write.tool91')}}>{{t 'write.tool91'}}</button>

            {{!-- <p onclick="return false" draggable="false" ondragstart="return false" title-2={{t 'fav.manage'}}>
              <a id ="favorites" {{on "click" (fn this.seeFavorites)}}>{{t 'fav.images'}}</a>
            </p><br> --}}

          {{/if}}

        </div>
        </RefreshThis>

        {{this.resetRadio}}

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' this.closeDialogUtil}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>

    <dialog id="dialogDupResult" style="max-width:calc(100vw - 2rem);z-index:15;max-width:480px"{{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <p>&nbsp;</p>
        {{!-- <p>{{{t 'write.dialogDupResult' a=this.imdbDirName}}}</p> --}}
        <p>{{{t 'write.dialogDupResult' a=this.z.imdbRoot}}}</p>
        <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogDupResult')}}>×</button>
      </header>
      <main style="padding:0 0.5rem 0 1rem;height:auto;line-height:150%;overflow:auto" width="99%">

        <div style="padding:0.5rem 0;line-height:1.4rem">
          {{#if this.countImgs}}
            {{t 'found'}} {{t 'dupImgNames'}}: {{{this.countImgs}}}<br>
            <button class="show" type="button" {{on 'click' this.doDupNamesShow}}>
              {{t 'button.show'}} <b>{{this.z.handsomize2sp this.z.picFound}}</b>
            </button><br>
          {{else}}
            {{!-- {{{t 'write.noDupNamesFound' a=this.imdbDirName}}}<br> --}}
            {{{t 'write.noDupNamesFound' a=this.z.imdbRoot}}}<br>
          {{/if}}
        </div>

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.closeDialog 'dialogDupResult')}}>
          {{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>

  </template>

}
