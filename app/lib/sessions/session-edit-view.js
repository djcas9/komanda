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
      self.model.trigger('changed');
      $.limpClose();
    },

    saveSession: function(e) {
      var self = this;

      self.model.set('uuid', uuid.v4());

      Komanda.sessions.fetch();
      Komanda.sessions.add(self.model);

      self.model.save(null);

      var connect = new Connect(self.model);
      Komanda.connections[self.model.get('uuid')] = connect; 

      $.limpClose();

      if (self.model.get('connectOnStart')) {
        connect.start(function(client) {
          _.each(self.model.get('channels'), function(c) {
            Komanda.vent.trigger(self.model.get('uuid') + ":join", c);
          });
        });
      }

    },

    destroySession: function() {
      var self = this;

      if (confirm('Are you sure you want to delete this source?')) {
        var uuid = this.model.get('uuid');

        Komanda.vent.trigger(uuid + ':disconnect', function() {

          var m = Komanda.sessions.get(uuid);
          m.destroy();
          Komanda.sessions.remove(m);

          $('.channel-holder .channel[data-server-id="'+uuid+'"]').remove();
          $.limpClose();
        });
      };
    },

    onRender: function() {
      var self = this;
      this._modelBinder.bind(this.model, this.el);
    }
  });

});
