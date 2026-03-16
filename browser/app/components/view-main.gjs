//== Mish main display view

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
// import { action } from '@ember/object';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { htmlSafe } from '@ember/template';
import he from 'he';
// USE: <div title={{he.decode 'text'}}></div> he = HTML entities
// or  txt = he.decode('text')  or  txt = he.encode('text')
import { MenuImage } from './menu-image';

import RefreshThis from './refresh-this';

import sortableItem from 'ember-draggable-modifiers/modifiers/sortable-item';
import { insertBefore, insertAfter, removeItem } from 'ember-draggable-modifiers/utils/array';

// import sortableGroup from 'ember-sortable/modifiers/sortable-group';
// import sortableItem from 'ember-sortable/modifiers/sortable-item';

import { dialogAlertId } from './dialog-alert';
import { dialogTextId } from './dialog-text';

const LF = '\n'; // LINE_FEED
const SA = '‡';  // SUBALBUM indicator, NOTE! set in server (routes.js)

export class ViewMain extends Component {
  @service('common-storage') z;
  @service intl;

  <template>
      <SubAlbums />
      <AllImages />
  </template>

}

class SubAlbums extends Component {
  @service('common-storage') z;
  @service intl;

  get nsub() { // No of subalbums of this album
    let res =  this.z.subaIndex.length;
    if (res < 1) res = this.intl.t('no');
    return res;
  }

  get nsubRoot() { // No of subalbums of the root album
    let res =  this.z.subaIndex.length - 1; // for the picFound album
    if (res < 1) res = this.intl.t('no');
    return res;
  }

  get sual() { // Subalbum(s) text
    if (this.z.subaIndex.length === 1) {
      return this.intl.t('subalbum');
    } else {
      return this.intl.t('subalbums');
    }
  }

  get sualRoot() { // Subalbum(s) text for root
    if (this.z.subaIndex.length === 2) { // 1 + picFound
      return this.intl.t('subalbum');
    } else {
      return this.intl.t('subalbums');
    }
  }

  get nadd() { // No of addititonal subsub...albums to this album
      // this.z.loli(this.z.imdbDirIndex);
    let coco = '';
    if (this.z.imdbCoco) coco = this.z.imdbCoco[this.z.imdbDirIndex];
    let plus= '';
    if (coco && coco.includes(SA)) { // Avoids error if imdbDirIndex is out of range
      let re = new RegExp(String.raw`${SA}.*$`) // If SA is '*' etc. then use ´\\*'
      // Check if there are more subalbums than the primary subalbums
      let more = Number(coco.replace(re, '').replace(/\ *[(0-9+)]+\ +([0-9]+)$/, '$1')) - this.z.subaIndex.length;

      if (more > 0) plus ='&nbsp;(+' + more + ')';
    }
    return plus;
  }

  get ifTool() {
    if (this.z.numShown || this.z.allow.albumEdit || this.z.allow.imgUpload) return true;
    else return false;
  }

  hasImages = () => {
    let txt = '';
    if (this.z.hasImages) {
      txt = this.z.numOrigin + ' ' + this.intl.t('images');
      if (this.z.numLinked) txt += ' (' + this.intl.t('own') + ') + ' + this.z.numLinked + ' ' + this.intl.t('linked');
    } else {
      txt =  this.intl.t('no') + ' ' + this.intl.t('images');
    }
    return txt;
  }

  imdbDirs = (i) => {
    return this.z.imdbDirs[i];
  }

  dirName = (i) => {
    return this.z.imdbDirs[i].replace(/^(.*\/)*([^/]+)$/, '$2').replace(/_/g, ' ');
  }

  setLabel = (i) => {
    let label = this.z.imdbLabels[i];
    if (!label) label = 'images/empty.gif';
    return label;
  }

  keepDir = (i) => {
      // this.z.loli(this.z.imdbDirs[i], 'color:red');
    return this.z.imdbDirs[i].slice(1, 2) === '§' ? false : true;
  }

  toggDia = async () => {
    let id = 'dialogUtil';
    this.z.albumTools = true;
    let diaObj = document.getElementById(id);
    if (diaObj.hasAttribute('open')) {
      document.getElementById(id).focus();
      this.z.closeDialog(id);
    } else {
      await this.z.openDialog(id);
      await new Promise (z => setTimeout (z, 322));
    }
  }

  <template>
   <RefreshThis @for={{this.z.numShown}}>
    <p class='albumsHdr' draggable="false" ondragstart="return false">
      <div class="miniImgs albs">
        {{#if this.z.imdbRoot}}

          {{#if this.ifTool}}
            {{!-- Open the Tools dialog --}}
            <button id="albumTools" type="button" title-2="{{t 'tools'}}" style="border:0;background:url(/images/tool0.png) center 0/2rem no-repeat" {{on 'click' (fn this.toggDia)}}> &nbsp; &nbsp; &nbsp;</button>
          {{/if}}

          {{#if this.z.imdbDir}}
            <span title-2="{{this.z.imdbRoot}}{{this.z.imdbDir}}">
              <b>”{{{this.z.handsomize2sp this.z.imdbDirName}}}”</b>
              {{t 'has'}} {{this.nsub}} {{this.sual}}<span title-2={{t 'plusExplain'}}>{{{this.nadd}}}</span>, &nbsp;<span>{{this.hasImages}}</span>
            </span>
          {{else}} {{!-- root --}}
            <span>
              <b>”{{{this.z.handsomize2sp this.z.imdbDirName}}}”</b>
              {{t 'has'}} {{this.nsubRoot}} <span title-2="”{{t 'foundExplain'}}”">(+1)</span> {{this.sualRoot}}<span title-2={{t 'plusExplain'}}>{{{this.nadd}}}</span>, &nbsp;<span>{{this.hasImages}}</span>
            </span>
          {{/if}}
          <br>
          {{#each this.z.subaIndex as |i|}}
            {{#if (this.keepDir i)}}
              <div class="subAlbum" title="" {{on 'click' (fn this.z.openAlbum i)}}>
                <a class="imDir" style="background:transparent">
                  <div title-2="Album ”{{this.dirName i}}”">
                    <img src={{this.setLabel i}} alt="Album ”{{this.dirName i}}”">
                  </div><br>
                  <span style="font-size:85%;color:{{this.z.subColor}}">{{this.dirName i}}</span>
                </a>
              </div>
            {{/if}}
          {{/each}}
        {{/if}}
      </div>
    </p>
   </RefreshThis>
  </template>

}

class AllImages extends Component {
  @service('common-storage') z;
  @service intl;

  // @tracked lastDragged; // for ember-sortable
  @tracked items = []; // NOTE: Used for allFiles duplication, below

  detectEsc = (event) => {
    event.stopPropagation();
    if (event.keyCode === 27) { // Esc
      this.z.resetBorders();
    }
  }

  // // For ember-sortable:

  // reorderItems = (itemModels, draggedModel) => {
  //   this.items = itemModels;
  //   this.lastDragged = draggedModel;
  // }

  // dragStarted = (item) => {
  //   this.z.loli(`dragStarted: ${item.name}`, 'color:red');
  //   console.log(item);
  // }

  // dragStopped = (item) => {
  //   this.z.loli(`dragStopped: ${item.name}`, 'color:red');
  //   // Close the show image view
  //   document.querySelector('.img_show').style.display = 'none';
  //   // Open the thumbnail view
  //   document.querySelector('.miniImgs.imgs').style.display = 'flex';
  //   this.z.resetBorders();
  //   this.z.markBorders(item.name);
  // }

  // Copies 'allFiles' to 'items' by real-value duplication
  // NOTE: the function is only called from the hidden preload button!
  allFiles = async () => {
    this.items = [];
    for (let file of this.z.allFiles) {
        // this.z.loli(file.show, 'color:red');
      this.items.push(file);
    }
  }

  // Returns 'none' or ''
  get ifShow() {
    return htmlSafe(this.z.displayNames);
  }

  // Are we within the temporary album?
  get isPicFound() {
    if (this.z.imdbDir.slice(1) === this.z.picFound) return true;
    else return false;
  }

  // Get the album path to the original image
  get path2orig() {
    let a = '';
    let i = this.z.picIndex;
    if (i < 0) return a; //important
    let b = this.z.allFiles[i];
    if (b) a = b.orig; //path to home album
    return this.z.imdbRoot + a.slice(2);
  }

  // The image caption texts (from metadata)
  txt = (no, name) => {
    let i = this.items.findIndex(item => {return item.name === name;});
    let r = '';
    if (i > -1) {
      if (no === 1) {
        r = this.items[i].txt1;
      } else {
        r = this.items[i].txt2;
      }
    }
    // if (!r.trim()) r = '&nbsp;';
    return r;
  }

  // Edit the image texts using DialogText
  ediText = async (event) => {
    event.stopPropagation();
    if (!this.z.allow.textEdit) return;
    let tgt = event.target;
    let old = this.z.picName;
    // NOTE: The picName is already set at .img_show (perhaps not at .img_mini):
    if (tgt.closest('.img_mini')) {
      this.z.picName = tgt.closest('.img_mini').id.slice(1);
      this.z.markBorders(this.z.picName, 'ViewMain.ediText');
    }
    if (old === this.z.picName) {
      this.z.toggleDialog (dialogTextId);
    } else {
      this.z.openDialog(dialogTextId);
    }
    await new Promise (z => setTimeout (z, 9)); // ediText
    document.querySelector('textarea[name="description"]').focus();
  }

  // Toggle the select mark in the upper right corner of the image.
  // The confusing 'double classing', seemingly unnecessary, has
  // historic css reasons, sorry.
  toggleSelect = (flag, e) => {
    e.stopPropagation();

    if (flag === 0) { // 0 == thumbnail image
      let thisPic = e.target.closest('.img_mini');
      let clicked = thisPic.querySelector('div[alt="MARKER"]');
      if (thisPic.classList.contains('selected')) {
        thisPic.classList.remove('selected');
        clicked.className = 'markFalse';
      } else {
        thisPic.classList.add('selected');
        clicked.className = 'markTrue';
      }
      this.z.countNumbers();

    } else { // 1 == slideshow image (copy info to the thumbnail)
      let thisPic = document.querySelector('#i' + this.z.escapeDots(this.z.picName));
      let clicked = document.querySelector('#markShow');
      if (thisPic.classList.contains('selected')) {
        thisPic.classList.remove('selected');
        thisPic.querySelector('div[alt="MARKER"]').className = 'markFalse';
        clicked.className = 'markFalseShow';
      } else {
        thisPic.classList.add('selected');
        thisPic.querySelector('div[alt="MARKER"]').className = 'markTrue';
        clicked.className = 'markTrueShow';
      }
    }
  }

  // itemVisualClass = 'sortable-item--active';
  //  *** NEXT check ember-sortable 5.0 on NPM 2025-01-24
  //============================================================
  // Requires: ember install ember-draggable-modifiers (before: ember-sortable)
  //============================================================
  move = ({ source: { data: draggedItem }, target: { data: dropTarget, edge } }) => {
    this.items = removeItem(this.items, draggedItem);

    if (edge === 'top') {
      this.items = insertBefore(this.items, dropTarget, draggedItem);
    } else {
      this.items = insertAfter(this.items, dropTarget, draggedItem);
    }
  }
  //============================================================

  <template>

    <div style="margin:0 2.2rem;width:auto;height:auto;text-align:center" {{on 'mousedown' this.z.resetBorders}} {{on 'keydown' this.detectEsc}}>

      {{#if this.z.imdbRoot}}

        {{!-- Here is an invisible button for album images load, used
        programmatically by z.openAlbum, display it for manual test/use! --}}
        <p class="tmpHeader" style="display:none">
            Press to (re)load images for
            <button id="loadMiniImages" type="button" {{on 'click' this.allFiles}}>{{{this.z.imdbDirName}}}</button>
        </p>

      {{else}}

        {{!-- Remind of choosing a root collection/album --}}
        {{!-- <span style='border-radius:2.5px;outline:#87cfff double 4px'> --}}
            &nbsp;{{t 'albumcollselect'}}&nbsp;
        {{!-- </span> --}}

      {{/if}}

      {{!-- The album's div with its 'random' thumnail images --}}
      {{!-- ==================================dialogAlertId=============== --}}
      <div class="miniImgs imgs" style="display:flex;flex-wrap:wrap">

        {{!-- The heading of the thumbnails' presentation --}}
        {{#if this.z.hasImages}}
        <div style="width:100%">

          {{!-- If the album isn't the root album: --}}
          {{#if this.z.imdbDir}}

            <p><b title-2="{{this.z.imdbRoot}}{{this.z.imdbDir}}">”{{{this.z.handsomize2sp this.z.imdbDirName}}}”</b>

            {{#if this.z.numHidden}}
              — {{this.z.numShown}}&nbsp;{{t 'shown'}},
              {{this.z.numInvisible}}&nbsp;{{t  'hidden'}}
            {{else}}
              — {{this.z.numShown}}&nbsp;{{t 'shown'}}
            {{/if}}

            ({{this.z.numMarked}}&nbsp;{{t 'marked'}})</p>

          {{!-- If the album is the root album: --}}
          {{else}} {{!-- root --}}

            <p><b>”{{{this.z.handsomize2sp this.z.imdbDirName}}}”</b>

            {{#if this.z.numHidden}}
              — {{this.z.numShown}}&nbsp;{{t 'shown'}},
              {{this.z.numInvisible}}&nbsp;{{t  'hidden'}}
            {{else}}
              — {{this.z.numShown}}&nbsp;{{t 'shown'}}
            {{/if}}

            ({{this.z.numMarked}}&nbsp;{{t 'marked'}})</p>

          {{/if}}

          {{!-- Don't put </span></p> terminators for #if/else here!
                Each #if/else-block needs it's own terminator! --}}

        </div>
        {{/if}}

        {{!-- The div of the thumnail images --}}
        <div id="imgWrapper" style="display:flex;flex-wrap:wrap;
          margin:auto;padding:0;align-items:baseline;
          justify-content:center;position:relative"
        >
          {{!-- The thumnail images are displayed --}}
          <RefreshThis @for={{this.z.refreshTexts}}>
          {{#each this.items as |item|}}
            <div class="img_mini {{item.symlink}}" id="i{{item.name}}"
              {{sortableItem data=item onDrop=this.move}}
              {{on 'mousedown' this.z.resetBorders}}
            >

              {{!-- The thumbnail menu --}}
              <MenuImage />
              <div style="margin:auto auto 0 auto;position:relative;width:max-content;">

                {{!-- The check mark in the thumnail's upper right corner --}}
                <div class="markFalse" alt="MARKER" draggable="false" ondragstart="return false" {{on 'click' (fn this.toggleSelect 0)}}>
                  <img src="/images/markericon.svg" draggable="false" ondragstart="return false" class="mark" title={{t 'Mark'}}>
                </div>

                {{!-- Here comes the thumbnail --}}
                <img src="{{item.mini}}" class="left-click" title="{{this.z.imdbRoot}}{{item.linkto}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showImage item.name item.show)}}>

              </div>
              <div {{on 'click' this.ediText}}>

                {{!-- This is the image name, should be unique --}}
                <div class="img_name" style="padding-right:0.7rem;display:{{this.ifShow}}">
                  {{item.name}}
                </div>

                {{!-- The text from Xmp.dc.description metadata --}}
                <div class="img_txt1" draggable="false" ondragstart="return false" title-2="{{this.z.noTags item.txt1}}">
                  {{{this.z.noTagsShort item.txt1}}}
                </div><br>

                {{!-- The text from Xmp.dc.creator metadata --}}
                <div class="img_txt2" draggable="false" ondragstart="return false" title-2="{{this.z.noTags item.txt2}}">
                  {{{this.z.noTagsShort item.txt2}}}
                </div>
                {{!-- <span class='handle' {{sortableHandle}}>&varr;</span> --}}

              </div>

            </div>
          {{/each}}
          </RefreshThis>
        </div>

        {{!-- Preload the show images --}}
        <section style="display:none">
          {{#each this.items as |item|}}
            <img src="{{item.show}}" style="width:1px;height:1px;display:none">
          {{/each}}
        </section>

      </div>

    </div>

    {{!-- ================================================ --}}
    {{!-- The album's div with the slideshow image --}}
    <div class="img_show" id="d{{this.z.picName}}" draggable="false" style="display:none;margin:2rem auto 0 auto">

        {{!-- An extra slideshow wrapping div --}}
        <div id="link_show" draggable="false" ondragstart="return false" style="position:relative;user-select:none">

          {{!-- A midpoint mark (ᵛ) on the slideshow image top border --}}
          <p style="margin:0;line-height:0;font-family:sans-serif;user-select:none">ᵛ</p>

          {{!-- The slideshow image comes here, src loaded at runtime --}}
          <img src="" draggable="false" ondragstart="return false" style="user-select:none">

          {{!-- The check mark in the slideshow image's upper right corner --}}
          <div id="markShow" class="" alt="MARKSHOW" draggable="false" ondragstart="return false" {{on 'click' (fn this.toggleSelect 1)}}  style="background:transparent;position:absolute;top:-15px;right:-15px;width:20px;height:20px">
            <img src="/images/markericon.svg" draggable="false" ondragstart="return false" class="mark" title="{{t 'Mark'}}" style="width:20px">
          </div>

          {{!-- The navigation information overlay of the slideshow image --}}
          <div class="toggleNavInfo" style="opacity:0">

            {{!-- Outside image: return-to-thumbnails click area --}}
            <a class="navReturn" style="top:-2.5rem; left:0%; width:100%; border:0" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showImage '')}}><p>{{t 'return'}} <span style="font:normal 1rem Arial!important">[Esc]</span></p></a>

            {{!-- Left backwards click area --}}
            <a style="top: 0%; left: 0%; width: 49.5%; height: 99.5%"
            draggable="false" ondragstart="return false"
            {{on 'click' (fn this.z.showNext false)}}>
              <p>{{t 'previous'}}<br><span style="font:normal 1rem Arial!important">[&lt;]</span></p><br>&nbsp;<br>&nbsp;
            </a>

            {{!-- Right forwards click area --}}
            <a style="top: 0%; left: 50%; width: 50%; height: 99.5%; border-left:0"
            draggable="false" ondragstart="return false"
            {{on 'click' (fn this.z.showNext true)}}>
              <p>{{t 'next'}}<br><span style="font:normal 1rem Arial!important">[&gt;]</span></p><br>&nbsp;<br>&nbsp;
            </a>

          </div>
          <MenuImage />

        </div>

        {{!-- The slideshow image's name and texts --}}
        <RefreshThis @for={{this.z.refreshTexts}}>
        <div id="link_texts" class="" draggable="false" ondragstart="return false" {{on 'click' this.ediText}}>

          {{!-- 'picName' should be unique; 'displayNames' is 'none' or '' --}}
          <div class="img_name" style="display:{{this.ifShow}}" draggable="false" ondragstart="return false" title="">
            {{this.z.picName}}
          </div>

          {{!-- The text from Xmp.dc.description metadata --}}
          <div class="img_txt1" draggable="false" ondragstart="return false" title="">
            {{{this.txt 1 this.z.picName}}}
          </div>

          {{!-- The text from Xmp.dc.creator metadata --}}
          <div class="img_txt2" draggable="false" ondragstart="return false" title="">
            {{{this.txt 2 this.z.picName}}}
          </div>

          {{#if this.isPicFound}}
            <div style="text-align:left;margin:0.2rem 0 -0.2rem 0;line-break:anywhere">
              <em style="color:#9e9;font-size:90%">{{t 'Original'}}: {{this.path2orig}}</em>
            </div>
          {{/if}}

        </div>
        </RefreshThis>

    </div>

  </template>
}
