define(function(require, exports, module) {
  var Marionette = require('marionette');

  module.exports = Marionette.AppRouter.extend({

    routes: {
      "": "index"
    },

    index: function() {
      var self = this;
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

