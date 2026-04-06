//== Mish language selections

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

// NOTE: Default language is primarily set in 'routes/application.js'
// The set-by-user language will be preserved in the 'mish_lang' cookie

// export const SUPPORTED_LOCALES = ['de-de', 'en-us', 'es-es', 'sv-se'];

export class Language extends Component {
  @service('common-storage') z;
  @service intl;

  get selections() {
    return this.intl.locales;
  }

  changeLocale = async (newLoc) => {
      // this.z.loli('locales = ' + this.selections, 'color:red');
    if (newLoc === this.z.intlCodeCurr) return;
    let defaultUser = this.z.userName === this.z.defaultUserName;
    this.intl.setLocale([newLoc]);
    this.z.intlCodeCurr = newLoc;
    this.z.setCookie('mish_lang', newLoc)
    this.z.loli('set language to ' + newLoc);
    if (defaultUser) { // Each language has a default user
      this.z.userName = this.z.defaultUserName;
      this.z.loli('userName is ' + this.z.userName);
    }
    // Irrational to change the picFound name just for a temporary language change!
        // this.z.picFound = this.z.picFoundBaseName +"."+ Math.random().toString(36)
        //   .slice(2,6); // Each language must update it's found pics name
  }

  isActive = (locale) => {
    return this.intl.primaryLocale === locale;
  }

  <template>
    <div style="display:inline-block">
    <div style="display:inline-block" title-2={{t 'select.language'}}>
      {{!-- Banners --}}
      {{#each this.selections as |tongue|}}
        <span class="langflags {{tongue}} {{if (this.isActive tongue) 'active'}}" ondragstart="return false" {{on "click" (fn this.changeLocale tongue)}} style="padding:0;margin:0"><img src="/images/{{tongue}}.svg" alt={{tongue}}></span>
      {{/each}}
    </div>
    </div>
  </template>
}
