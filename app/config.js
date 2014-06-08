require.nodeRequire = window.requireNode;

requirejs.config({
  paths: {
    "vendor": "../vendor",
    "almond": "../vendor/bower/almond/almond",
    "jquery": "../vendor/bower/jquery/dist/jquery",
    "underscore": "../vendor/bower/lodash/dist/lodash.underscore",
    "moment": "../vendor/bower/momentjs/moment",
    "backbone": "../vendor/bower/backbone/backbone",
    marionette: '../vendor/bower/marionette/lib/core/amd/backbone.marionette',
    'backbone.wreqr': '../vendor/bower/backbone.wreqr/lib/backbone.wreqr',
    'backbone.babysitter': '../vendor/bower/backbone.babysitter/lib/backbone.babysitter',
    "backbone-plugins": "backbone-plugins",

    // https://github.com/afeld/backbone-nested
    "backbone-nested-model": "lib/deps/backbone-nested",
    'backbone-modelbinder': 'lib/deps/backbone-modelbinder',

    // Require.js plugins
    text: 'libs/require/text',
    hbs: "../vendor/bower/require-handlebars-plugin/hbs",
    uuid: "lib/deps/uuid",

    // Keybindings             :
    'Mousetrap'                :  '../vendor/bower/mousetrap/mousetrap',
    'mousetrap-pause'          :  '../vendor/bower/mousetrap/plugins/pause/mousetrap-pause',
    'backbone.mousetrap'       :  '../vendor/bower/backbone.mousetrap/backbone.mousetrap',
    // sotage
    localStorage               :  '../vendor/bower/backbone.localStorage/backbone.localStorage',
    IndexedDBShim              :  '../vendor/bower/IndexedDBShim/dist/IndexedDBShim',
    indexedDB                  :  '../vendor/bower/indexeddb-backbonejs-adapter/backbone-indexeddb'
  },

  shim: {
    'underscore': {
      exports: "_"
    },
    "backbone": {
      "deps": ["underscore", "jquery"],
      "exports": "Backbone"
    },
    'backbone-modelbinder': ["backbone"],
    "uuid": {
      exports: "uuid"
    },
    localStorage: {
      deps: ['underscore', 'backbone']
    },
    indexedDB: {
      deps: ['underscore', 'backbone']
    },
    'IndexedDBShim': {
      exports: 'shimIndexedDB'
    },
    // Mousetrap
    'Mousetrap': { },
    'mousetrap-pause': {
      deps: ['Mousetrap']
    },
    'backbone.mousetrap': {
      deps: ['Mousetrap', 'mousetrap-pause', 'underscore', 'backbone']
    },
  },

  hbs: {
    helpers: true,
    i18n: false,
    templateExtension: 'hbs',
    partialsUrl: '',
    helperDirectory: 'template/helpers/',
    helperPathCallback: function(name) {
      return 'templates/helpers/' + name;
    }
  }
});
