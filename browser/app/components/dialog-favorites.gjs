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
const BLUE = '\x1b[1;34m'; // Bright blue
const RED  = '\x1b[1;31m'; // Red
const RSET = '\x1b[0m';    // Reset

export class DialogFavorites extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked first = true;
  @tracked nameArr = '';
  @tracked realArr;
  @tracked indices = [];
  @tracked items = [];

  // There is a need for a reset nameArr/realArr function
  // since it is the view that has priority!?!?!?!?
  resetArr = () => {
    const textEl = document.getElementById('favText');
    if (textEl) {
      this.nameArr = this.z.noTags(textEl.value);
        this.z.loli('nameArr:\n' + this.nameArr, 'color:yellow');
      this.nameArr = this.nameArr.replace(/\n\n/g, LF).trim();
      this.realArr = this.nameArr.split(LF);
      // textEl.innerHTML = this.realArr.map(line => `<div>${line}</div>`).join(LF);
      textEl.value = this.nameArr;
      if (this.nameArr) this.z.setCookie('mish_favorites', this.realArr.join(','));
      // else don't clear the cookie!?
    }
  }

  addImages = () => {
    if (this.z.picIndex > -1) this.z.toggleMenuImg(0);
    this.indices = [];
    this.items = [];
    let toAdd = '';
    let marked = document.querySelectorAll('.img_mini.selected ');
    if(!marked.length || !this.z.numMarked) {
      this.z.alertMess(this.intl.t('noneMarked'), 1.5);
      return
    } else {
      // The show image is auto-marked like its thumbnail.
      // The show image MAY be made visible AND MAY be one of the
      // marked images, thus ensure it also is marked OFF (false):
      document.getElementById('markShow').className = 'markFalseShow';
      for (let pic of marked) {
        this.z.markOff(pic);
        toAdd += LF + pic.id.slice(1); // Remove the first = image name
      }
      this.z.countNumbers();
    }
    this.nameArr = this.nameArr + toAdd;
    this.nameArr = this.nameArr.trim();
    this.realArr = this.nameArr.split(LF);
    const textEl = document.getElementById('favText');
    // // *****
    // const observer = new MutationObserver((mutations) => {
    //   console.log('DOM mutation:', mutations);
    //   console.log('Current value:', textEl.value);
    // });
    // observer.observe(textEl, {
    //   childList: true,
    //   characterData: true,
    //   subtree: true
    // });
    // // *****
      // console.log('textEl:', textEl);
      // console.log('nameArr:\n' + this.nameArr);
    // *****
    // const valueDescriptor =
    //   Object.getOwnPropertyDescriptor(
    //     HTMLTextAreaElement.prototype, 'value'
    //   );
    // Object.defineProperty(textEl, 'value', {
    //   get() {
    //     return valueDescriptor.get.call(this);
    //   },
    //   set(v) {
    //     console.trace('TEXTAREA VALUE SET:\n' + v);
    //     valueDescriptor.set.call(this, v);
    //   },
    //   configurable: true
    // });
    // *****
      //textEl.value = this.realArr.map(line => `<div>${line}</div>`).join(LF);
    // // *****
    // console.log('Immediately:', textEl.value);
    // console.log('Element:', textEl.tagName);
    // console.log('Connected:', textEl.isConnected);
    // requestAnimationFrame(() => {
    //   console.log('Next frame:', textEl.value);
    // });
    // // *****
    textEl.value = this.nameArr;
      console.log('realArr:', this.realArr);
    // Scroll to make the last visible:
    textEl.scrollTop = textEl.scrollHeight; // next line is equivalent
    // textEl.scroll(0, textEl.scrollHeight); // with textEl.scroll()
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
        this.realArr[this.indices[i]] = this.realArr[this.indices[i]] + '§';
      }
      this.nameArr = this.realArr.join(LF);
      // textEl.value = this.realArr.map(line => `<div>${line}</div>`).join(LF);
      textEl.value = this.nameArr;
        console.log(text);
        console.log(this.items);
        console.log(this.indices)
    } else {
      // this.indices = [];
      // this.nameArr = '';
      // textEl.value = this.nameArr;
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
    } else {
      this.nameArr = this.nameArr.replace(/\§/g, ''); // Remove selection marks
      // Remove the HTML tags from the marked lines
      // for (let i=0;i<this.indices.length;i++) {
      //   let j = this.indices[i];
      //   this.realArr[j] = this.z.noTags(this.realArr[j]);
      // this.nameArr = this.realArr.join(LF);
      this.realArr = this.nameArr.split(LF);
    }
    this.indices = [];
    this.items = [];
    // textEl.innerHTML = this.realArr.map(line => `<div>${line}</div>`).join(LF);
    // textEl.value = this.realArr.map(line => `${line}`).join(LF);
    textEl.value = this.realArr.join(LF);
    this.resetArr();
  }

  saveImages = async () => {
    // this.nameArr = this.z.noTags(document.getElementById('favText').innerHTML).trim();
    this.nameArr = this.nameArr.replace(/\§/g, ''); // Remove selection marks
      this.z.loli('saveImages, nameArr:\n' + this.nameArr, 'color:pink');
    this.realArr = this.nameArr.split(LF);
    if (this.nameArr) this.z.setCookie('mish_favorites', this.realArr.join(','));
    else this.z.setCookie('mish_favorites', '');
  }

  initLoadImages = () => { getPromiseState(this.loadImages()); } // avoid "obj" printout
  loadImages = async () => {
    if (this.first) {
      this.first = false;
      this.realArr = this.z.getCookie('mish_favorites').split(',');
      this.nameArr = this.realArr.join(LF).trim();
      const textEl = document.getElementById('favText');
      if (textEl) {
        // textEl.value = this.realArr.map(line => `<div>${line}</div>`).join(LF);
        textEl.value = this.nameArr;
        textEl.addEventListener('change', async (event) => {
          var tgt = event.target;
          console.log('NODENAME =', tgt.nodeName);

        });
        textEl.scroll(0, textEl.scrollHeight);
      }
    } else return;
  }

  <template>
    <dialog id="dialogFavorites" style="width:min(calc(100vw - 2rem),auto);max-width:480px;z-index:16;transform:none" {{this.listenInput}}>
      <header data-dialog-draggable>
        <p>&nbsp;</p>
        <p>{{t 'write.tool9'}}</p>
        <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>×</button>
      </header>

      <main style="padding:0.75rem;min-height:14rem">

        <div style="width:auto;height:auto;background:#fff">
          <textarea id="favText" class="favorites" name="favorites" placeholder="Skriv in favoriter = bildnamn" rows="16" cols="52" autofocus {{on 'input' this.resetArr}}></textarea>
          {{!-- <div id="favText" class="favorites" name="favorites" placeholder="Skriv in favoriter = bildnamn" style="height:100%;width:100%" autofocus contenteditable="true"></div> --}}
        </div>

      </main>
      {{this.initLoadImages}}

      <footer data-dialog-draggable style="display:block;text-align:center">
        {{t 'numMarked'}}: {{this.z.numMarked}}<br>
        <button type="button" {{on 'click' (fn this.resetArr)}}>{{t 'button.getFavorites'}}</button>
        <button type="button" {{on 'click' (fn this.addImages)}}>{{t 'button.add'}}</button>
        <button type="button" {{on 'click' (fn this.removeImages)}}>{{t 'button.remove'}}</button>
          <button type="button" {{on 'click' (fn this.resetArr)}}>{{t 'button.save'}}</button>&nbsp;<button type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>{{t 'button.close'}}</button>
      </footer>
    </dialog>
  </template>

}
