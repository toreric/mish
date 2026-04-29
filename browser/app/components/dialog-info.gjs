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
import { TrackedAsyncData } from 'ember-async-data';

import { dialogAlertId } from './dialog-alert';

export const dialogInfoId = 'dialogInfo';
const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break

// Detect closing Esc key
const detectEscClose = (e) => {
  if (e.code !== 'Escape') return;
  e.stopPropagation();
  let diaObj = document.getElementById(dialogInfoId);
  if (diaObj.open) {
    diaObj.close();
    console.log('-"-: closed ' + dialogInfoId);
  }
}

// const informQual = () => { // Replaces inform('qual')
//   let obj = document.getElementById(dialogAlertId);
//   if (obj.hasAttribute('open')) {obj.close();}
//     this.z.alertMess(this.intl.t('xplErrImg'), 15);
// }

export class DialogInfo extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked imQual = '?';
  @tracked statResult = 'N.A.';

  inform = (what) => {
    let obj = document.getElementById(dialogAlertId);
    switch(what) {
      case 'dups':
        if (obj.hasAttribute('open')) {obj.close(); break;}
        this.z.alertMess('<div style="text-align:center;font-weight:normal;color:#000">' + this.intl.t('findImageDups') + '</div>' + BR + this.intl.t('futureFacility'), 15); break;
      case 'qual': // don't know how to use this: an alert from the STATUS link
        if (obj.hasAttribute('open')) {obj.close(); break;}
        this.z.alertMess(this.intl.t('xplErrImg') + BR + BR + '<div style="text-align:center;font-weight:normal;color:#000">' + this.imQual + '</div>', 15); break;
    }
  }

  // ==== Before Vite etc. ==========================
  // Get information about this image from the server
  // This promise has to be run indirectly with TrackedAsyncData
  // See the actual getStat use, further down in the template!
  // actualGetStat = async () => {
  //   let i = this.z.picIndex();
  //   if (i > -1) return await this.z.getFilestat(this.z.allFiles[i].linkto);
  // }
  // get getStat() {
  //   let recordPromise = this.actualGetStat();
  //   if (!recordPromise) return;
  //   let tmp = new TrackedAsyncData(recordPromise);
  //   return tmp;
  // }
  // ================================================

  // === Proposed by AI: =============================
  // stat = use(this, resource(({ on }) => {
  //   // dependency
  //   let index = this.z.picIndex;
  //   // tell Ember when to recompute
  //   on(() => this.z.allFiles);
  //   on(() => index);
  //   // guard
  //   if (index <= -1) return;
  //   // return promise directly
  //   return this.z.getFilestat(this.z.allFiles[index].linkto);
  // }));

  // === Next from AI: ===============================
  // stat = resource(this, async () => {
  //   let index = this.z.picIndex;
  //     this.z.loli('index = ' + index, 'color:red');
  //   if (index < 0) return Promise.resolve(null);
  //   let tmp = await this.z.getFilestat(this.z.allFiles[index].linkto);
  //     this.statResult = tmp;
  //     this.z.loli(this.statResult, 'color:yellow');
  //   return tmp;
  // });

  // === Next from NullVoxPopuli: ====================
// just an async function
  stat = async () => {
    let index = this.z.picIndex;
      this.z.loli('index = ' + index, 'color:red');
    if (index < 0) return Promise.resolve(null);
    let tmp = await this.z.getFilestat(this.z.allFiles[index].linkto);
      this.z.loli('tmp: ' + tmp, 'color:yellow');
    this.statResult = tmp;
    return tmp;
  };

  // the cached here is important, else each access re-invokes
  // this.stat(), and you lose your stable reference
  // and: don't set something tracked in a getter (may spoil the browser!)
  @cached get currentStat() {
    let tmp = getPromiseState(this.stat());
      console.log(tmp);
    // this.statResult = tmp.resolved; WARNING NO ERROR DETECTION
    return tmp;
  }
  // ==== + corresponding changes in the template ====

  @cached get showStat() {
    let arr = this.statResult.split(BR);
      this.z.loli('arr: ' + arr, 'color:red');

    // Image name
    let txt = '<i>' + this.intl.t('Name') + '</i>: ';
    txt += '<span style="color:black">' + this.z.picName + '</span>' + BR;

    // Image quality status
    if (arr[5] === 'NA') {
      this.imQual = this.intl.t('notAvailable');
    } else {
      this.imQual = arr[5].replace(/, /, '\n');//.replace(/ /g, '&nbsp;');
    }

    // Original image file path
    txt += '<i>' + this.intl.t('Filename') + '</i>: ';
    if (arr[4]) {
      txt += arr[4] + BR;
    } else {
      txt += arr[6] + BR;
    }

    // File status
    txt += '<a class="hoverDark status" ';
    txt += 'style="font-family:sans-serif;font-variant:all-small-caps" ';
    txt += 'title-2="' + this.imQual + '" >' + this.intl.t('status') + '</a><br>';

    // Linked image
    if (arr[4]) {
      txt += '<span style="color:#0a4;font-family:sans-serif;font-variant:small-caps">' + this.intl.t('explainLink') + ':</span>' + BR;
      txt += '<i>' + this.intl.t('Linkname') + '</i>:<span style="color:#0a4"> ' + arr[6] + '</span>' + BR;
    }

    let NA = '<span style="color:#b0f">' + this.intl.t('notAvailable') + '</span>';

    // Image size
    txt += '' + BR + '<i>' + this.intl.t('Size') + '</i>: ' + arr[0] + BR;
    if (arr[1] === 'NA') arr[1] = NA;
    txt += '<i>' + this.intl.t('Dimension') + '</i>: ' + arr[1] + BR + BR;

    // Date-time information
    if (arr[2] === 'NA') arr[2] = NA;
    txt += '<i>' + this.intl.t('Phototime') + '</i>: ' + arr[2] + BR;
    txt += '<i>' + this.intl.t('Moditime') + '</i>: ' + arr[3] + BR + BR;
      this.z.loli('txt: ' + txt, 'color:pink');
    return txt;
  }

  <template>
    <dialog id="dialogInfo" {{on 'keydown' detectEscClose}} open>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p>{{t 'dialog.info.header'}}<span></span></p>
        </div>
        <div>
          <button class="close" type="button" {{on 'click' @toggleInfo}}>×</button>
        </div>
      </header>

      <main style="padding:1rem 1rem 1.5rem 1rem;text-align:center;min-height:10rem;color:blue">

        {{!-- {{#if this.currentStat.resolved}} --}}
        {{#if this.currentStat.resolved}}

          {{!-- File statistics: --}}
          {{{this.showStat}}}

          {{!-- Find duplicates --}}
          <a class="hoverDark" title-1="{{t 'findImageDups'}}" style="font-family:sans-serif;font-variant:small-caps" {{on 'click' (fn this.inform 'dups')}}>{{t 'findDuplicates'}}</a> {{t 'simiThres'}} = <form style="display:inline-block"><input class="threshold" type="number" min="40" max="100" value="70" title="{{t 'selectTreshold'}} 40&ndash;100%"></form>%
          <br>
        {{else if this.currentStat.isLoading}}
          . . . {{t 'wait'}} . . .
          {{!-- Do nothing, just wait --}}
        {{else if this.currentStat.error}}
          <p>REJECTED</p>
        {{/if}}

      </main>

      <footer data-dialog-draggable>
        <button type="button" {{on 'click' @toggleDialog}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>
}

