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
    if (e.code === 'Escape') this.z.toolsVisible = !this.z.toolsVisible;
  }

  <template>
    <dialog id="dialogFavorites" style="width:min(calc(100vw - 2rem),auto);max-width:480px;z-index:16;transform:none" {{on 'keydown' this.detectEscClose}} open>
      <header data-dialog-draggable>
        <p>&nbsp;</p>
        <p>{{t 'write.tool9'}}</p>
        <button class="close" type="button" {{on 'click' @toggleFavorites}}>×</button>
      </header>

      <main style="padding:0 0.75rem;min-height:14rem" width="99%">

      </main>

      <footer data-dialog-draggable>
        <button type="button" {{on 'click' @toggleFavorites}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>

}
