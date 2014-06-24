define([
  "underscore",
  "marionette",
  "backbone-plugins",
  "lib/settings",
  "hbs!templates/settings/komanda"
], function(_, Marionette, Backbone, Settings, template) {

  return Marionette.ItemView.extend({
    _modelBinder: undefined,
    className: ".edit-komanda-settings",
    template: template,

    events: {
    },

    initialize: function() {
      var self = this;
      this._modelBinder = new Backbone.ModelBinder();
    },

    openLink: function(e) {
      e.preventDefault();
      var href = $(e.currentTarget).attr("href");
      Komanda.gui.Shell.openExternal(href);
    },

    onClose: function() {
      this._modelBinder.unbind();
    },

    onRender: function() {
      var self = this;
      this._modelBinder.bind(this.model, this.el);
    }
  });

});
