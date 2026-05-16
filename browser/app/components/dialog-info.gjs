//== Mish individual file information dialog

import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import RefreshThis from './refresh-this';
import { use } from 'ember-resources';
import { resource } from 'ember-resources';
import { htmlSafe } from '@ember/template';
import { getPromiseState } from 'reactiveweb/get-promise-state';
// import { MenuImage } from './menu-image';
// import { cached } from '@glimmer/tracking';
import { dialogAlertId } from './dialog-alert';

export const dialogInfoId = 'dialogInfo';
const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break

// Detect closing Esc key
// const detectEscClose = (e) => {
//   if (e.code !== 'Escape') return;
//   e.stopPropagation();
//   let diaObj = document.getElementById(dialogInfoId);
//   if (diaObj.open) {
//     diaObj.close();
//     console.log('-"-: closed ' + dialogInfoId);
//   }
// }

export class DialogInfo extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked arr = [];
  @tracked linkedImage = false;
  @tracked fileSize = '?'; //0
  @tracked imgDim = '?';   //1
  @tracked phTime = '?';   //2
  @tracked moTime = '?';   //3
  @tracked fileName = '?'; //4
  @tracked imQual = '?';   //5
  @tracked linkName = '?'; //6
  @tracked statResult = 'N.A.';

  inform = (what) => {
    let obj = document.getElementById(dialogAlertId);
    switch(what) {
      case 'dups':
        if (obj.hasAttribute('open')) {obj.close(); break;}
        this.z.alertMess('<div style="text-align:center;font-weight:normal;color:#000">' + this.intl.t('findImageDups') + '</div>' + BR + this.intl.t('futureFacility'), 4); break;
      case 'qual': // don't know how to use this: an alert from the STATUS link
        if (obj.hasAttribute('open')) {obj.close(); break;}
        this.z.alertMess(this.intl.t('xplErrImg') + BR + BR + '<div style="text-align:center;font-weight:normal;color:#000">' + this.imQual + '</div>', 4); break;
    }
  }

  // === from NullVoxPopuli: =========================
// just an async function
  stat = async () => {
    let index = this.z.picIndex;
      // this.z.loli('index = ' + index, 'color:red');
    if (index < 0) return Promise.resolve(null);
    let tmp = await this.z.getFilestat(this.z.allFiles[index].linkto);
      // this.z.loli('tmp: ' + tmp, 'color:yellow');
    this.statResult = tmp;
    return tmp;
  };

  // the cached here is important, else each access re-invokes
  // this.stat(), and you lose your stable reference
  // Own NOTE: don't set something tracked in a getter (may spoil the browser!)
  @cached get currentStat() {
    let tmp = getPromiseState(this.stat());
      // console.log(tmp);
    return tmp;
  }
  // ==== + corresponding changes in the template ====

 showStat = () => { // reduced to PREPARATION
    this.arr = this.statResult.split(BR);
      // this.z.loli('this.arr: ' + this.arr, 'color:yellow');
    for (let i=0;i<this.arr.length;i++) {
      // exception i==5, to be used as attribute value (no HTML)
      if (i !== 5 && (this.arr[i] === 'NA' || this.arr[i] === 'undefined')) this.arr[i] = '<span style="color:#b0f">' + this.intl.t('notAvailable') + '</span>';
    }

    // Is it a symlink image?
    this.linkedImage = this.arr[4] ? true : false;
    this.fileSize = this.arr[0];
    this.imgDim = this.arr[1];
    this.phTime = this.arr[2];
    this.moTime = this.arr[3];
    this.fileName = this.arr[4]; // links need a real filepath
    // special care when i==5 (image quality)
    if (this.arr[5] === 'undefined' || this.arr[5] === 'NA') this.imQual = this.intl.t('notAvailable');
    else this.imQual = this.arr[5].replace(/, /, '\n');
    this.linkName = this.arr[6];
  }

  <template>
    {{!-- <dialog id="dialogInfo" {{on 'keydown' detectEscClose}} open> --}}
    <dialog id="dialogInfo" open>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p>{{t 'dialog.info.header'}}<span></span></p>
        </div>
        <div>
          <button class="close" type="button" {{on 'click' @toggleInfo}}>×</button>
        </div>
      </header>

      <main style="padding:1rem 1rem 1.5rem 1rem;text-align:center;min-height:10rem;color:blue">

        {{#if this.currentStat.resolved}}

          {{!-- File statistics preparation --}}
          {{{this.showStat}}}

          {{!-- Image name --}}
          <i>{{t 'Name'}}</i>
          <span style="color:black">{{this.z.picName}}</span><br>

          {{!-- Original image file path --}}
          {{t 'Filename'}}
          {{#if this.linkedImage}}
            {{this.fileName}}
          {{else}}
            {{this.linkName}}
          {{/if}}

          {{!-- Image quality status --}}
          <br><a class="hoverDark" style="font-family:sans-serif;font-variant:all-small-caps" title-2={{this.imQual}} {{on 'click' (fn this.inform 'qual')}} >{{t 'status'}}</a><br>

          {{!-- Linked image --}}
          {{#if this.linkedImage}}
            <span style="color:#0a4;font-family:sans-serif;font-variant:small-caps">{{t 'explainLink'}}</span><br>
            <i>{{t 'Linkname'}}</i>: <span style="color:#0a4">{{{this.linkName}}}</span><br>
          {{/if}}

          {{!-- Image size --}}
          <br><i>{{t 'Size'}}</i>: {{{this.fileSize}}}<br>
          <i>{{t 'Dimension'}}</i>: {{{this.imgDim}}}<br><br>

          {{!-- Date-time information --}}
          <i>{{t 'Phototime'}}</i>: {{{this.phTime}}}<br>
          <i>{{t 'Moditime'}}</i>: {{{this.moTime}}}<br><br>

          {{!-- Find duplicates --}}
          <a class="hoverDark" title-1="{{t 'findImageDups'}}" style="font-family:sans-serif;font-variant:all-small-caps" {{on 'click' (fn this.inform 'dups')}}>{{t 'findDuplicates'}}</a> {{t 'simiThres'}} = <form style="display:inline-block"><input class="threshold" type="number" min="40" max="100" value="70" title="{{t 'selectTreshold'}} 40&ndash;100%"></form>%
          <br>

        {{else if this.currentStat.isLoading}}
          . . . {{t 'wait'}} . . .
          {{!-- Do nothing, just wait --}}
        {{else if this.currentStat.error}}
          <p>REJECTED</p>
        {{/if}}

      </main>

      <footer data-dialog-draggable>
        <button type="button" {{on 'click' @toggleInfo}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>
}

