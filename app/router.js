define(function(require, exports, module) {
  var Marionette = require('marionette');
  var _ = require('underscore');

  module.exports = Marionette.AppRouter.extend({

    routes: {
      "": "index"
    },

    index: function() {
      var self = this;

      if (Komanda.test) return;
      Komanda.test = true;

      var SessionsView = require("lib/sessions/sessions-view");
      var Session = require("lib/sessions/session");

      Komanda.sessions.fetch();

      var view = new SessionsView({
        collection: Komanda.sessions,
        model: new Session()
      });

      var region = new Backbone.Marionette.Region({ el: '#sidebar' });
      region.show(view);
    },

    loadView: function(item) {
      var self = this;

      if (item.hasOwnProperty('cid')) {

        if (self.view) {
          self.view.close();
        }

        self.view = item;
        return self.view;

      } else {
        if (self.region) self.region.close();
        self.region = item;

        return self.region;
      }
    },

    renderView: function(args) {
      var self = this;

      if (!args.hasOwnProperty('view'))
        throw "A view object is required.";

      if (!args.hasOwnProperty('el'))
        throw "EL is required.";

      var view = self.loadView(args.view);
      var region = self.loadView(new Marionette.Region({
        el: args.el
      }));

      region.show(view);
    },

  });
});

