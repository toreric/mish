import { setApplication } from '@ember/test-helpers';
import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';
import { start as qunitStart, setupEmberOnerrorValidation } from 'ember-qunit';

import Application from 'mish-client/app';
import config from 'mish-client/config/environment';

export function start() {
  setApplication(Application.create(config.APP));

  setup(QUnit.assert);

  setupEmberOnerrorValidation();

  qunitStart();
}
