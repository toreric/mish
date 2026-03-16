//== Mish choose-alert message dialog with two choices and an optional checkbox
//   NOTE: Most be opened as MODAL with openModalDialog to be properly initiated
//   INTERACTS with selectChoice setting buttonNumber

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

import { dialogAlertId } from './dialog-alert';
export const dialogChooseId = 'dialogChoose';

export class DialogChoose extends Component {
  @service('common-storage') z;
  @service intl;

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      if (document.getElementById(dialogAlertId).open) this.z.closeDialog(dialogAlertId);
      if (document.getElementById(dialogChooseId).open) this.z.closeDialog(dialogChooseId);
    }
  }
  // PLEASE READ THE HEADER

  <template>
   <dialog id="dialogChoose" style="max-width:min(38rem, 90vh);top:-40vh;" {{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p style="color:blue">{{{this.z.infoHeader}}}<span></span></p>
        </div><div>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog dialogChooseId)}}>×</button>
        </div>
      </header>
      <main draggable="false" ondragstart="return false">
        <p style="padding:0 1rem">{{{this.z.chooseText}}}</p>
        <span class="glueInline Choice_3" style="display:none">
          <input id="Choice_3" type="checkbox" {{on 'click' (fn this.z.selectChoice 3)}}>
          <label for="Choice_3" style="white-space:wrap;margin:0 0 1rem 1rem">Checkbox label</label>
        </span>
      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.selectChoice 1)}}>{{t 'button.confirm'}}</button>&nbsp;
        <button autofocus type="button" {{on 'click' (fn this.z.selectChoice 2)}}>{{t 'button.cancel'}}</button>
      </footer>
    </dialog>
  </template>
}
