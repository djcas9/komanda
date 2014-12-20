define([
  "marionette",
  "hbs!templates/channel-item",
  "helpers"
], function(Marionette, template, helpers) {

  return Marionette.ItemView.extend({
    tagName: "li",
    className: "channel-item",
    template: template,
    attributes: {
      "draggable": "true"
    },

    events: {
    },

    initialize: function() {
      var self = this;
      self.showStatusChange = Komanda.settings.get("notifications.status");

      Komanda.vent.on("ignoreStatusChange", function() {
        self.showStatusChange = false;
      });
    },

    onClose: function() {
    },

    onRender: function() {
      var $this = $(this.el);
      var server = this.model.get("server");
      var channel = this.model.get("channel");

      var s = Komanda.sessions.get(server);

      if (s) {
        if (this.model.get("status") && !s.get("connectionOpen")) {
          $this.addClass("offline");
        }
      }

      $this.attr("data-server-id", server);
      $this.attr("data-name", channel);

      if (Komanda.current.server === server && Komanda.current.channel === channel) {
        $("li.channel-list").removeClass("selected");
        $this.addClass("selected");
      }

      if (Komanda.store.hasOwnProperty(server)) {

        if (Komanda.store[server].hasOwnProperty(channel)) {
          if (Komanda.store[server][channel] == 1) {
            $this.addClass("new-messages");
          } else if (Komanda.store[server][channel] == 2) {
            $this.addClass("highlight");
          }
        }

      } else {
        Komanda.store[server] = {
          count: {}
        };
        Komanda.store[server][channel] = 0;
        Komanda.store[server].count[channel] = 0;

        Komanda.vent.trigger("komanda:update:badge");
      }


    }
  });

});
