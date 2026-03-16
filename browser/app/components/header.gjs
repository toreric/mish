//== Mish temporary Header component
//   Referenced in 'welcome.gjs'
//   NOTE: this is a testing component to be eventually removed!

import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import t from 'ember-intl/helpers/t';

import { dialogTextId } from './dialog-text';
import { Excite } from './excite';

export default class Header extends Component {
  @service('common-storage') z;
  @service intl;

  <template><div class="tmpHeader" style="margin:0 4rem;padding:0;display:none">

    {{!-- <p class="buttons">
      <span>&nbsp; &nbsp; &nbsp; Testing: </span>
      <select>
        {{! Selection example where the first visible option disapppears }}
        <option value="" selected disabled hidden>Select</option>
        <option value="0" style="color:red">Red</option>
        <option value="1" style="color:green">Green</option>
        <option value="2" style="color:blue">Blue</option>
      </select>
    </p> --}}

    {{! Testing ember-intl and some other things }}
    {{!-- <Excite />
    {{this.z.intlCodeCurr}} {{t "price_banner" product='A (1)' price=76.5}}
    <span style="font-size:85%">&nbsp; &nbsp; &nbsp; Default laguage is set in <strong style="font-size:85%">routes/application.js</strong></span> --}}

    <p>
      Dialog-testing buttons:
      &nbsp;
      <button type="button" {{on 'click' (fn this.z.toggleDialog dialogTextId 0)}}>{{t 'dialog.text.toggle'}}</button>
      <button type="button" {{on 'click' (fn this.z.openDialog dialogTextId 1)}}>{{t 'dialog.text.open.origpos'}}</button>
      &nbsp;
      <button type="button" {{on 'click' (fn this.z.openModalDialog dialogTextId 0)}}>{{t 'dialog.text.open.modal'}}</button>
    </p>

  </div></template>
}
