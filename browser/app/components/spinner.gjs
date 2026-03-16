//== Spinner

import Component from '@glimmer/component';
import { service } from '@ember/service';
import t from 'ember-intl/helpers/t';
import { on } from '@ember/modifier';

export class Spinner extends Component {
  @service('common-storage') z;
  @service intl;

  hideSpinner = () => {
    document.querySelector('img.spinner').style.display = 'none';
    this.z.loli('stopped spinner');
  }

  <template>
    <img src="/images/spinner.svg" class="spinner" draggable="false" ondragstart="return false" {{on 'click' this.hideSpinner}} style="display:none" title="{{t 'spinwait'}}">
  </template>;

}
