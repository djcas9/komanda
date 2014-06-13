require.nodeRequire = window.requireNode;

requirejs.config({
  paths: {
    "vendor": "../vendor",
    "almond": "../vendor/bower/almond/almond",
    "jquery": "../vendor/bower/jquery/dist/jquery",
    autolink: "lib/deps/autolink",
    caret: "lib/deps/caret",
    tabcomplete: "lib/deps/tab-complete",
    limp: "lib/deps/limp",

    // Embed
    gistembed: "lib/deps/embed/gist-embed",

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
    'backbone-mousetrap'       :  'lib/deps/backbone-mousetrap',
    // sotage
    localStorage               :  '../vendor/bower/backbone.localStorage/backbone.localStorage'
  },

  shim: {
    'underscore': {
      exports: "_"
    },
    "backbone": {
      "deps": ["underscore", "jquery"],
      "exports": "Backbone"
    },
    "autolink": {
      "deps": ["jquery"]
    },
    "limp": {
      "deps": ["jquery"]
    },
    "gistembed": {
      "deps": ["jquery"]
    },
    "caret": {
      "deps": ["jquery"]
    },
    'Mousetrap': {
      exports: "Mousetrap"
    },
    'mousetrap-pause': {
      deps: ['Mousetrap'],
      exports: "Mousetrap"
    },
    'backbone-modelbinder': ["backbone"],
    "uuid": {
      exports: "uuid"
    },
    localStorage: {
      deps: ['underscore', 'backbone']
    }
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
