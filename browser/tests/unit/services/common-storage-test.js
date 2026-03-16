import { module, test } from 'qunit';
import { setupTest } from 'polaris-starter/tests/helpers';

module('Unit | Service | common-storage', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:common-storage');
    assert.ok(service);
  });
});
