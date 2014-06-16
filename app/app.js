define(function(require) {


  var Marionette = require("marionette");
  var Backbone = require("backbone");
  var Vent = require('vent');
  var Setting = require('lib/settings');

  if (window.Komanda) return window.Komanda;

  window.Komanda = new Marionette.Application();

  window.Komanda.vent = Vent;

  if (!window.Komanda.hasOwnProperty("store")) {
    window.Komanda.store = {};
  }

  window.requireJS = window.require;

  return window.Komanda;
});
