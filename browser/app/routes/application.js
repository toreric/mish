//== Mish prepare locales, choose default language

// import Route from '@ember/routing/route';
// import { service } from '@ember/service';

// export default class ApplicationRoute extends Route {
//   @service('common-storage') z;
//   @service intl;

//   async beforeModel() {
//     // this.intl.setLocale(['sv-se']);
//     // this.intl.setLocale(['de-de']);
//     this.intl.setLocale(['en-us']);
//     this.z.initialize();
//   }
// }

import Route from '@ember/routing/route';
import { service } from '@ember/service';
import translationsForDeDe from 'virtual:ember-intl/translations/de-de';
import translationsForEnUs from 'virtual:ember-intl/translations/en-us';
import translationsForEsEs from 'virtual:ember-intl/translations/es-es';
import translationsForSvSe from 'virtual:ember-intl/translations/sv-se';

export default class ApplicationRoute extends Route {
  @service intl;

  beforeModel() {
    this.setupIntl();
  }

  setupIntl() {
    this.intl.addTranslations('de-de', translationsForDeDe);
    this.intl.addTranslations('en-us', translationsForEnUs);
    this.intl.addTranslations('es-es', translationsForEsEs);
    this.intl.addTranslations('sv-se', translationsForSvSe);

    this.intl.setLocale(['en-us']);
  }
}
