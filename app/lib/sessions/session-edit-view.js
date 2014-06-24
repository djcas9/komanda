define([
  "underscore",
  "marionette",
  "backbone-plugins",
  "lib/sessions/sessions",
  "lib/sessions/session",
  "hbs!templates/session-edit",
  "uuid",
  "connect",
  "jquery",
  "limp"
], function(_, Marionette, Backbone, Sessions, Session, template, uuid, Connect, $) {

  return Marionette.ItemView.extend({
    _modelBinder: undefined,
    className: ".edit-session",
    template: template,

    initialize: function() {
      var self = this;
      this._modelBinder = new Backbone.ModelBinder();
    },

    onClose: function() {
      this._modelBinder.unbind();
    },

    events: {
      "click button.save-new-session": "saveSession"
    },

    cancel: function(e) {
      e.preventDefault();
      var self = this;
    },

    editSession: function(e) {
      var self = this;
      self.model.save(null);
      Komanda.sessions.fetch();
      $.limpClose();
    },

    saveSession: function(e) {
      var self = this;

      self.model.set("uuid", uuid.v4());

      Komanda.sessions.fetch();
      Komanda.sessions.add(self.model);

      self.model.save(null);

      var connect = new Connect(self.model);
      Komanda.connections[self.model.get("uuid")] = connect;

      $.limpClose();

      if (self.model.get("connectOnStart")) {
        connect.start(function(client) {
          _.each(self.model.get("channels"), function(c) {
            if (c.trim().length > 0) {
              Komanda.vent.trigger(self.model.get("uuid") + ":join", c.trim());
            }
          });
        });
      }

    },

    destroySession: function() {
      var self = this;

      if (confirm("Are you sure you want to delete this server?")) {
        var uuid = this.model.get("uuid");

        var remove = function() {
          var m = Komanda.sessions.get(uuid);

          var cv = Komanda.connections[uuid].client.channelsView;
          if (cv) cv.close();

          m.destroy();
          Komanda.sessions.remove(m);

          $(".channel-holder .channel[data-server-id=\"" + uuid + "\"]").remove();
          $.limpClose();
        };

        if (this.model.get("connectionOpen")) {
          Komanda.vent.trigger(uuid + ":disconnect", remove);
        } else {
          remove();
        }
      }
    },

    onRender: function() {
      var self = this;
      this._modelBinder.bind(this.model, this.el);
    }
  });

});
