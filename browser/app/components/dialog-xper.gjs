//== Mish experimental dialog
//   Referenced in 'welcome.gjs'

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { htmlSafe } from '@ember/template';
// import { MenuImage } from './menu-image';

// import sortableGroup from 'ember-sortable/modifiers/sortable-group';
// import sortableItem from 'ember-sortable/modifiers/sortable-item';

export const dialogXperId = 'dialogXper';
const LF = '\n';


export class DialogXper extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked tool = ''; // utility tool id

  // Which tool was selected?
  detectRadio = async (e) => {
    console.log(e);
    // if (!e) return;
    var elRadio = e.target;
      this.z.loli(`${elRadio.id} ${elRadio.checked}`, 'color:red');
    this.tool = elRadio.id;
  }

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      if (document.getElementById(dialogXperId).open) this.z.closeDialog(dialogXperId);
    }
  }

  toggleTmpHeader = () => {
    let elem = document.querySelector('.tmpHeader');
    let disp = 'none';
    if (elem.style.display) {
      disp = '';
    }
    for(elem of document.querySelectorAll('.tmpHeader')) elem.style.display = disp;
  }

  updOrder = (n) => {
    if (n === 1) {
      this.z.loli(LF + 'LOADED OR MODIFIED' + LF + this.z.sortOrder, 'color:pink');
    } else if (n === 2) {
      let tmp = this.z.updateOrder();
      this.z.loli(LF + 'ACTUAL, IF SAVED' + LF + tmp, 'color:lightcoral');
    }
  }

  <template>
    <dialog id="dialogXper" {{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p>Experimental dialog<span></span></p>
        </div>
        <div>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog dialogXperId)}}>×</button>
        </div>
      </header>
      <main style="text-align:center;min-height:10rem;padding:1rem">

      <div id="_this_is_no_image" style="position:relative">
          {{@content}}
        <br>  <br>
        <button type="button" {{on 'click' this.toggleTmpHeader}}>
          Hide/show the test component ”&lt;Header /&gt;”
        </button>
        <br>
        <button type="button" {{on 'click' (fn this.updOrder 1)}}>
          sortOrder *
        </button>
        <button type="button" {{on 'click' (fn this.updOrder 2)}}>
          New sortOrder *
        </button>
        <br>* shown in the browser console

        {{!-- <br>
        <button type="button" {{on 'click' (fn this.z.openModalDialog 'chooseAlbum')}}>
          chooseAlbum
        </button> --}}

        <div>
          <div title-2="The CSS-generated ”title-2” is shown here">
          <br>&nbsp; <br>
            For display of<br>CSS: title-2
          </div>
        </div>
        <br>
        <div style="text-align:left">
          <h1>Radio buttons</h1>
          <span class="glue">
            <input id="rtest1" name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
            <label for="rtest1"> &nbsp;{{t 'write.tool1'}}</label>
          </span>
          <span class="glue">
            <input id="rtest2" name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
            <label for="rtest2"> &nbsp;{{t 'write.tool2'}}</label>
          </span>
          <span class="glue">
            <input id="rtest3" name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
            <label for="rtest3"> &nbsp;{{t 'write.tool3'}}</label>
          </span>
          <span class="glue">
            <input id="rtest4" name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
            <label for="rtest4"> &nbsp;{{t 'write.tool4'}}</label>
          </span>
          <span class="glue">
            <input id="rtest5" name="albumUtility" type="radio" {{on 'click' (fn this.detectRadio)}}>
            <label for="rtest5"> &nbsp;{{t 'write.tool5'}}</label>
          </span>
        </div>
      </div>

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.closeDialog dialogXperId)}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>
}
