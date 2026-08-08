//== Mish favorites dialog

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

const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break

export class DialogFavorites extends Component {
  @service('common-storage') z;
  @service intl;

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.code === 'Escape') { // Esc key
      if (document.getElementById('dialogFindHelp').open) {
        this.z.closeDialog('dialogFindHelp');
      } else if (document.getElementById('dialogFavorites').open) {
        this.z.closeDialog('dialogFavorites');
      }
    }
  }

  <template>
    <div style="display:flex" {{on 'keydown' this.detectEscClose}}>
    <dialog id="dialogFavorites">
      <header data-dialog-draggable>
        <div style="width:99%">
          &nbsp; <p>{{t 'write.tool9'}}</p>
        </div>
        <div>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>×</button>
        </div>
      </header>

      <main style="padding:1rem 1rem 1.5rem 1rem;text-align:left;min-height:10rem;color:blue">

      </main>

      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.closeDialog 'dialogFavorites')}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
    </div>
  </template>

}
