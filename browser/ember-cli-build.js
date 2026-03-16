'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');
const { Webpack } = require('@embroider/webpack');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {});

  return compatBuild(app, new Webpack(__dirname), {
    staticAddonTrees: true,
    // staticAddonTestSupportTrees: true,
    staticHelpers: true,
    staticComponents: true,
    staticModifiers: true,
    // staticEmberSource: true,
    packagerOptions: {
      webpackConfig: {
        devtool: 'source-map'
      }
    }
  });
};

// 'use strict';

// const EmberApp = require('ember-cli/lib/broccoli/ember-app');
// const { Webpack } = require('@embroider/webpack');
// const { compatBuild } = require('@embroider/compat');

// module.exports = function (defaults) {
//   const app = new EmberApp(defaults, {
//     // Add options here
//   });

//   return compatBuild(app, new Webpack(), {
//     staticAddonTrees: true,
//     staticAddonTestSupportTrees: true,
//     staticHelpers: true,
//     staticModifiers: true,
//     staticComponents: true,
//     staticEmberSource: true,
//     splitControllers: true,
//     splitRouteClasses: true,
//   });
// };


// 'use strict';

// const EmberApp = require('ember-cli/lib/broccoli/ember-app');
// const { Webpack } = require('@embroider/webpack');

// module.exports = function (defaults) {
//   const app = new EmberApp(defaults, {
//     // Add options here
//   });

//   return require('@embroider/compat').compatBuild(app, new Webpack(app), {
//     staticAddonTrees: true,
//     staticAddonTestSupportTrees: true,
//     staticHelpers: true,
//     staticModifiers: true,
//     staticComponents: true,
//     staticEmberSource: true,
//     splitControllers: true,
//     splitRouteClasses: true,
//   });

// };
