define([
  "underscore",
  "marionette",
  "backbone",
  "moment",
  "localStorage",
  // "Mousetrap",
  // "mousetrap-pause",
  // "backbone.mousetrap",
  "backbone-modelbinder",
  "backbone-nested-model"
], function(_, Marionette, Backbone) {

  Backbone.ModelBinder.SetOptions({
    modelSetOptions: {
      validate: true
    },
    changeTriggers: {
      '': 'change'
    }
  });

  return Backbone;
});
