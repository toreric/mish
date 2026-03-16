//== Mish main menu, select image root directoriy, display album tree

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { htmlSafe } from '@ember/template';

import { dialogAlertId } from './dialog-alert';
import { dialogFindId } from './dialog-find';
import { dialogUtilId } from './dialog-util';

import RefreshThis from './refresh-this'

export const menuMainId = 'menuMain';
const BR = '<br>'; // HTML line break
const LF = '\n';   // LINE_FEED == New line
const OP = '⊕';   // OPENS
const CL = '⊖';   // CLOSES
const SA = '‡';    // SUBALBUM indicator, NOTE! set in server (routes.js)

export class MenuMain extends Component {
  @service('common-storage') z;
  @service intl;
  @tracked hasHidden = false;
  @tracked opcl = CL;

  // Choose collection = album root directory and its album (sub)directories
  // and convert them into an object tree with an amended property set.
  // Finally indicate if this album tree has any hidden-without-allowance album.
  selectRoot = async (event) => { // Album root = collection
    this.z.imdbRoot = event.target.value;
      // console.log(document.getElementById('rootSel'));
      // this.z.loli(document.getElementById('rootSel').selectedIndex, 'color:red');
    document.querySelector('.miniImgs.imgs').style.display = 'flex';
    if (!this.z.imdbRoot)  {
      document.querySelector('.miniImgs.imgs').style.display = 'none';
      return;
    }
    this.z.imdbDir = ''; // The root is assumed initially selected
    this.z.loli('IMDB_ROOT (imdbRoot) set to ' + this.z.imdbRoot, 'color:orange');
    const allow = this.z.allow; // permissions

    // Display the spinner already (will be hidden somewhere else)
    document.querySelector('img.spinner').style.display = '';

    await new Promise (z => setTimeout (z, 699)); // selectRoot, ensurance!?
    // The wait reason: Sometimes getAlbumDirs is unsuspectedly null

    // Retreive the albums list of this collection (root album).
    // If the argment is false, _imdb_ignore.txt in the chosen
    // root album is read by the server, and mentioned albums
    // with subalbums are removed from the list:
    let tmp = await this.z.getAlbumDirs(allow.textEdit);
      // this.z.loli('getAlbumDirs:' + LF + tmp, 'color:red');
    let arr = tmp.split(LF);

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // The three first lines (to be shifted off) have other content
    // First, we get some system information from the server:
    await this.z.execute('echo "' + arr.shift() + '" > nodestamp.txt');
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // Secondly, here 'IMDB_HOME' is (finally!) delivered from the server to be
    // stored in 'userDir', which is our corresponding 'common-storage' variable.
    // IMDB_HOME is given as an 'Express' server parameter at startup:
    this.z.userDir = arr.shift();
      // this.z.loli('userDir and imdbPath:  ' + this.z.userDir + '  ' + this.z.imdbPath, 'color:red');
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // Thirdly, 'IMDB_WWW' also comes from the server to be stored in 'wwwDir':
    this.z.wwwDir = arr.shift();
      // this.z.loli('wwwDir: ' + this.z.wwwDir, 'color:red');
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

    let n = arr.length/3;
    this.z.imdbDirs = arr.splice(0, n); // album paths (without root)
    this.z.imdbCoco = arr.splice(0, n); // album content counts
    this.z.imdbLabels = arr.splice(0, n); // album labels (thumbnail paths)
      // this.z.loli('imdbCoco ' + n + LF + this.z.imdbCoco.join(LF), 'color:yellow');
      // this.z.loli('imdbDirs ' + n + LF + this.z.imdbDirs.join(LF), 'color:yellow');
      // this.z.loli('imdbLabels ' + n + LF + this.z.imdbLabels.join(LF), 'color:yellow');
      // this.z.loli(this.z.imdbDirs, 'color:green');

    // let data = structuredClone(this.z.imdbDirs); // alt. clone-copy
    let data = [...this.z.imdbDirs]; // clone-copy albums
    let root = this.z.imdbRoot;
    for (let i=0;i<data.length;i++) {
      data[i] = root + data[i]; // amend the root directory name
    }
        // this.z.loli('imdbRoot/imdbDirs ' + n + LF + data.join(LF), 'color:yellow');
        // this.z.loli(data);
        // this.z.loli(this.z.imdbDirs, 'color:red');

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
          tree.root[partPath] = (tree[partPath] ??= { name: part, index: i++, coco: this.z.imdbCoco[i-1], path: partPath, label: this.z.imdbLabels[i-1], children: [] }); // m2.
        } else if (tree[partPath] === undefined) {
          tree[partPath] = { name: part, index: i++, coco: this.z.imdbCoco[i-1], path: partPath, label: this.z.imdbLabels[i-1], children: [] }; // m2.
          branch.children.push(tree[partPath]);
            // this.z.loli(part + ' ' + i, 'color:deeppink');
          if (part === this.z.picFound) this.z.picFoundIndex = i - 1; // m3.
        }
        branch = tree[partPath];
      }
      // branch.children.push({ name: file, id: path }); // m1.
    }
    const result = Object.values(tree.root);
    //end https://stackoverflow.com/questions/72006110/convert-file-path-into-object

      // console.log(result);
    this.z.imdbTree = result;
      // this.z.loli(this.z.imdbTree);
      // this.z.loli(this.z.imdbDirs);
      // JSON.stringify makes the album tree human readable:
      // this.z.loli('imdbTree ' + n + LF + JSON.stringify(result, null, 2), 'color:yellow');
      // this.z.loli(this.z.imdbCoco.length, 'color:red');
    // await new Promise (z => setTimeout (z, 33*this.z.imdbCoco.length)); // selectRoot Wait for album tree
    await new Promise (z => setTimeout (z, 3333)); // selectRoot Wait for album tree
    this.toggleTree(CL); // fold all nodes except 0

    let anyHidden = () => { // flags any hidden-without-allowance album
      let hidden = false;
      for (let i=0;i<this.z.imdbCoco.length;i++) {
        if (this.z.imdbCoco[i].includes('*')) { // contains() is deprecated!
          hidden = true;
        }
      }
      return hidden;
    }
    this.hasHidden = anyHidden(); // if there are any hidden-but-allowed albums
    this.z.openAlbum(0); // Select the root album

    // Copy the 'text' directory from the album root to  the web root which
    // makes available to be linked to within the image captions by writing
    // <a href="text/«file name»" target="_blank">«link text»</a>, where the
    // target attribute is important in order to avoid confusing appearance
    // on the SPA page: Best to shift-click, which opens another browser window.
    await this.z.execute('mkdir -p ' + this.z.imdbPath + '/text');
    await this.z.execute('cp -rf ' + this.z.imdbPath + '/text ' + this.z.wwwDir + '/');

    this.z.closeMainMenu('after opening root album'); // Close the main menu
      // this.z.loli(this.z.imdbDirs);
  }

  // The @tree argument for Tree component
  get tree() {
    return this.args.tree ?? this.z.imdbTree;
  }

  // Manage favorite image lists
  seeFavorites = () => {
    if (this.missingRoot()) return;
    let alrt = document.getElementById(dialogAlertId);
    if (alrt.open) {
      alrt.close();
    } else {
      this.z.alertMess('<div style="text-align:center">' + this.intl.t('fav.manage') + ':' + BR + BR + this.intl.t('futureFacility') + '</div>');
    }
    // ...todo
  }

  // Check if the alert dialog is open (then close it), or if no
  // album root/collection (imdbRoot) is chosen (then open it)
  missingRoot = () => {
    if (document.getElementById('dialogAlert').hasAttribute('open')) {
      this.z.closeDialog(dialogAlertId);
    }
    if (!this.z.imdbRoot) {
      // alertMess opens the alert dialog
      this.z.alertMess(this.intl.t('needaroot'), 0);
      document.querySelector('.mainMenu select').focus();
      return true;
    }
    return false;
  }

  // Open enough nodes to make the selected album visible
  showSelected = async () => {
    let index = this.z.imdbDirIndex;
    let selected = document.querySelector('div.album.a' + index);
    selected.style.display = '';
    // Check that all parents are visible too
    while (selected.parentElement.classList.contains('album')) {
      selected = selected.parentElement;
      if (selected.nodeName !== 'DIV') break;
      selected.style.display = '';
    }
    selected = document.querySelector('span.album.a' + index);
    selected.scrollIntoView(); // If invisible, show off!
    selected.classList.add('blink');
    await new Promise (z => setTimeout (z, 666)); // showSelected blink pause
    selected.classList.remove('blink');
  }

  // Open all or close all (except root) nodes of albumTree
  toggleTree = (opcl) => {
    let all = document.querySelector('div.albumTree').querySelectorAll('a.album');
    let i0 = 1; // Don't close root
    if (opcl === OP) i0 = 0;
    for (let i=i0;i<all.length;i++) {
      if (all[i].innerHTML.includes(opcl)) all[i].click();
    }
    if (opcl === OP) this.opcl = CL;
    else this.opcl = OP;
  }

  // Count the number of images in this album
  totalImgNumber = () => {
    let a = this.z.totalOrigImg();
    return a.toString();
  }

  <template>

    <div id="menuMain" class="mainMenu" onclick="return false" draggable="false" ondragstart="return false" style="display:none">

      <p onclick="return false" draggable="false" ondragstart="return false">
        <a class="" style="color:white;cursor:default">

          <select id="rootSel" title-2={{t 'albumcollinfo'}} {{on 'change' this.selectRoot}} {{on 'mousedown' (fn this.z.closeDialog this.dialogAlertId)}}>
            <option value="" selected>{{t 'selalbumcoll'}}</option>
            {{#each this.z.imdbRoots as |rootChoice|}}
              <option value={{rootChoice}} selected={{eq this.z.imdbRoot rootChoice}}>{{rootChoice}}</option>
            {{/each}}
          </select>

          <a class="rootQuest" title-2={{t 'albumSelectInfo'}}>&nbsp;?&nbsp;</a>
        </a>
      </p><br>

      {{!-- Hidden button for [F] open of doFindText --}}
      <button id="searchText" type="button" style="display:none" {{on 'click' (fn this.z.doFindText)}}>[F]</button>

      <RefreshThis @for={{this.z.refreshTree}}>
      <div id="albumHead">
        <span style="margin:0.2rem;padding:0.1rem 0.2rem">
          <em>{{t 'totalImgNumber'}}</em>:&nbsp;{{this.totalImgNumber}}

          <a style="margin:0 0.2rem 0 0.5rem;padding:0.1rem 0.2rem;border:0.5px solid #d3d3d3;border-radius:4px" title-2={{t 'openallalb'}} {{on "click" (fn this.toggleTree this.opcl)}}>{{this.opcl}} {{t 'all'}}</a>

          <a style="margin:0;padding:0.1rem 0.2rem;border:0.5px solid #d3d3d3;border-radius:4px" {{on "click" (fn this.showSelected)}}>{{t 'showselected'}}</a>
        </span>
      </div>

      <div class="albumTree">
        <Tree @tree={{this.tree}} />
        {{#if this.z.imdbRoot}}
          <p style="font-size:77%;vertical-align:top;line-height:1.1rem;margin:0 0.2rem 0 3rem">
            <span style="color:#e0e;font-size:inherit">{{t 'tmpalbum1'}} § {{t 'tmpalbum2'}}</span> {{t 'tmpalbum3'}}<br>
            (⋅) {{t 'nimages'}}, (⋅+⋅) {{t 'nlinked'}}<br>
            {{SA}} {{t 'nsubalbums'}}
            {{#if this.hasHidden}}
              <br>* <span style="color:pink;font-size:inherit">{{t 'anyhidden'}}</span>
            {{/if}}
          </p>
        {{/if}}
      </div>
      </RefreshThis>

    </div>

  </template>
}

class Tree extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked isOpen = true;
  @tracked disp = '';

  get display() {
    return htmlSafe(this.disp);
  }

  // Open(show) or close(hide) a node in the album tree
  toggleThis = () => {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.disp = '';
    } else {
      this.disp = 'none';
    }
  }

  clickButton = (event) => {
    let tgt = event.target;
    if (tgt.tagName === 'IMG') { // if 'A IMG' is clicked, rather than 'A'
      tgt = tgt.parentElement;
    }
    // Below is where the invisible button is used:
    let button = tgt.parentElement.querySelector('button');
    button.click();
    if (tgt.innerText.includes(OP)) {
      tgt.innerHTML = CL + '<img src="img/folderopen.gif" />';
    } else {
      tgt.innerHTML = OP + '<img src="img/folder.gif" />';
    }
  }

  <template>

    {{!-- The button is invisible but still used! --}}
    <button style="display:none" {{on 'click' this.toggleThis}}>
      {{if this.isOpen 'Close' 'Open'}}
    </button>
    {{#each @tree as |node|}}
      <div class="album a{{node.index}}" style="display:{{this.display}}">
        {{#if node.children}}
          <a class="album a{{node.index}}" {{on "click" this.clickButton}}>
            {{CL}}<img src="img/folderopen.gif" />
          </a>
        {{else}}
          &nbsp;&nbsp;&nbsp; <img src="img/folderopen.gif" />
        {{/if}}
        <span style="font-size:77%;vertical-align:top;line-height:1.1rem">
          {{node.index}}&nbsp;&nbsp;
        </span>
        <span class="album a{{node.index}}" style="cursor:pointer" {{on "click" (fn this.z.openAlbum node.index)}}{{on "click" (fn this.z.closeMainMenu 'after selection in the album tree')}}>{{node.name}}</span>
        <span style="font-size:77%;vertical-align:top">
          &nbsp;&nbsp;{{node.coco}}
        </span>
        <br>
        {{#if node.children}}
          <Tree @tree={{node.children}} />
        {{/if}}
      </div>
    {{/each}}

  </template>
}

