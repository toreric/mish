//== Mish alert message dialog

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

export const dialogAlertId = 'dialogAlert';
import { dialogChooseId } from './dialog-choose';

export class DialogAlert extends Component {
  @service('common-storage') z;

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      if (document.getElementById(dialogAlertId).open) this.z.closeDialog(dialogAlertId);
      if (document.getElementById(dialogChooseId).open) this.z.closeDialog(dialogChooseId);
    }
  }

  // Detect closing click outside a dialog-draggable modal dialog
  detectClickOutside = (e) => {
    e.stopPropagation();
    // this.z.loli(navigator.userAgent);
    if (!navigator.userAgent.includes("Firefox")) return; // Only Firefox can do this
    let tgt = e.target.id;
    if (tgt === dialogLoginId || tgt === dialogRightsId ) {
      // Outside a modal dialog, else not!
      this.z.closeDialog(tgt);
    }
  }

  <template>
    <dialog id="dialogAlert" style="z-index:999" {{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p style="color:blue">{{this.z.infoHeader}}<span></span></p>
        </div><div>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog dialogAlertId)}}>×</button>
        </div>
      </header>
      <main>

        <p style="padding:1rem;font-weight:bold;color:blue">{{{this.z.infoMessage}}}</p>

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.closeDialog dialogAlertId)}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>
}
