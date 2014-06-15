define([
  "underscore",
  "marionette",
  "backbone",
  "moment",
  "Mousetrap",
  "mousetrap-pause",
  "backbone-mousetrap",
  "backbone-modelbinder",
  "backbone-nested-model",
  "localStorage",
], function(_, Marionette, Backbone) {

  Backbone.ModelBinder.SetOptions({
    modelSetOptions: {
      validate: false
    },
    changeTriggers: {
      '': 'change'
    }
  });

  return Backbone;
});
