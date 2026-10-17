//== Mish favorites dialog

import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import RefreshThis from './refresh-this';
import { use } from 'ember-resources';
import { resource } from 'ember-resources';
import { htmlSafe } from '@ember/template';
import { getPromiseState } from 'reactiveweb/get-promise-state';

const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break
const RED  = '\x1b[31m';   // Red
const RSET = '\x1b[0m';    // Reset

export class DialogFavorites extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked nameArr = '';
  @tracked realArr;
  @tracked indices = [];
  @tracked items = [];

// Det behövs en allmän reset-namArr/realArr-funktion
// för att det är fönstret som gäller!!?!!
  resetArr = () => {
    const textEl = document.getElementById('favText');
    if (textEl) {
      this.nameArr = textEl.innerHTML;
      this.nameArr = this.nameArr.replace(/\n\n/g, LF).trim();
      textEl.innerHTML = this.nameArr;
      this.realArr = this.nameArr.split(LF);
      if (this.nameArr) this.z.setCookie('mish_favorites', this.realArr.join(','));
    }
  }

  addImgages = () => {
    if (this.z.picIndex > -1) this.z.toggleMenuImg(0);
    this.indices = [];
    this.items = [];
    let toAdd = '';
    let marked = document.querySelectorAll('.img_mini.selected ');
    if(!this.z.numMarked || !marked.length) {
      this.z.alertMess(this.intl.t('noneMarked'), 1.5);
      return
    } else {
      for (let pic of marked) {
        // TODO: this.z.markOff(pic) DONE
        // ALSO: this.z.markOn(pic)
        // pic has its id == pic.id.slice(1)
        this.z.markOff(pic);
        toAdd += LF + pic.id.slice(1);
      }
      this.z.countNumbers();
    }
    this.nameArr += toAdd;
    this.nameArr = this.nameArr.trim();
    const textEl = document.getElementById('favText');
      console.log('nameArr:', this.nameArr);
    textEl.innerHTML = this.nameArr;
    this.realArr = this.nameArr.split(LF);
      console.log('realArr:', this.realArr);
  }

  removeImages = async () => {
    this.z.toggleMenuImg(0);
    this.items = [];
    let text = window.getSelection().toString();
    const textEl = document.getElementById('favText');
    if (text.length > 0) {
      this.items.push(...text.split(LF));
      for (let item of this.items) {
        this.realArr.forEach((str, i) => {
          if (str.includes(item)) this.indices.push(i);
        });
      }
      this.indices = [...new Set(this.indices)];
      for (let i=0;i<this.indices.length;i++) {
        this.realArr[this.indices[i]] = '=>' + this.realArr[this.indices[i]] + '<=';
      }
      textEl.innerHTML = this.realArr.join(LF);
        console.log(text);
        console.log(this.items);
        console.log(this.indices)
    } else {
      this.indices = [];
      this.nameArr = '';
      textEl.innerHTML = this.nameArr;
    }
    this.z.infoHeader = this.intl.t('write.chooseHeader');
    let n = this.indices.length
    switch(n) {
      case 0: return; break;
      case 1: this.z.chooseText = this.intl.t('write.chooseRemove1'); break;
      case 2: this.z.chooseText = this.intl.t('write.chooseRemove2'); break;
      default: this.z.chooseText = this.intl.t('write.chooseRemove', {n: n});
    }
    this.z.buttonNumber = 0;
    // this.z.buttonNumber is set with this.z.selectChoice
    // to 1 or 2 when a DialogChoose button is clicked:
    await new Promise (z => setTimeout (z, 29)); // DialogFavorites
    this.z.openModalDialog('dialogChoose');
    while (!this.z.buttonNumber) {
      await new Promise (z => setTimeout (z, 49)); // DialogFavorites
    } // if another button leave and close
    this.z.closeDialog('dialogChoose');
    if (this.z.buttonNumber === 1) {
      // Remove the marked lines from the list
      for (let i=0;i<this.indices.length;i++) {
        let j = this.indices[i];
        this.realArr[j] = '';
      }
      this.nameArr = '';
      for (let i=0;i<this.realArr.length;i++) {
        if (this.realArr[i]) this.nameArr += this.realArr[i] + LF;
      }
      this.indices = [];
    } else {
      // Remove the HTML tags from the marked lines
      for (let i=0;i<this.indices.length;i++) {
        let j = this.indices[i];
        this.realArr[j] = this.z.noTags(this.realArr[j]);
      }
      this.nameArr = this.realArr.join(LF);
    }
    this.items = [];
    textEl.innerHTML = this.nameArr;
    this.resetArr();
  }

  saveImages = async () => {
    this.nameArr = document.getElementById('favText').innerHTML.trim();
    this.realArr = this.nameArr.split(LF);
    if (this.nameArr) this.z.setCookie('mish_favorites', this.realArr.join(','));
    else this.z.setCookie('mish_favorites', '');
  }

  loadImages = async () => {
    this.realArr = this.z.getCookie('mish_favorites').split(',');
    this.nameArr = this.realArr.join(LF).trim();
    document.getElementById('favText').innerHTML = this.nameArr;
  }

  <template>
    <dialog id="dialogFavorites" style="width:min(calc(100vw - 2rem),auto);max-width:480px;z-index:16;transform:none">
      <header data-dialog-draggable>
        <p>&nbsp;</p>
        <p>{{t 'write.tool9'}}</p>
        <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>×</button>
      </header>

      <main style="padding:0.75rem;min-height:14rem">

        <div style="width:auto;height:auto;background:#fff">
          <textarea id="favText" class="favorites" name="favorites" placeholder="Skriv in favoriter = bildnamn" rows="16" cols="52" {{on 'change' this.resetArr}}></textarea>
        </div>

      </main>

      <footer data-dialog-draggable style="display:inline-block;text-align:center">
        {{t 'numMarked'}}: {{this.z.numMarked}}<br>
        <button type="button" {{on 'click' (fn this.loadImages)}}>{{t 'button.getFavorites'}}</button>
        <button type="button" {{on 'click' (fn this.addImgages)}}>{{t 'button.add'}}</button>
        <button type="button" {{on 'click' (fn this.removeImages)}}>{{t 'button.remove'}}</button>
        <button type="button" {{on 'click' (fn this.saveImages)}}>{{t 'button.save'}}</button>&nbsp;<button type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>{{t 'button.close'}}</button>
      </footer>
    </dialog>
  </template>

}
