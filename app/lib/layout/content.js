define(["marionette", "hbs!templates/layout/content"], function(Marionette, template) {

  var keyboardEvents;
  if(process.platform === "darwin") {
    keyboardEvents = {
      "command+up": "channelUp",
      "command+down": "channelDown",
      // debug
      "command+d": "debug",
      "command+r": "reload",
      "command+w": "channelClose"
    };
  } else {
    keyboardEvents = {
      "ctrl+up": "channelUp",
      "ctrl+down": "channelDown",
      // debug
      "ctrl+d": "debug",
      "ctrl+r": "reload",
      "ctrl+w": "channelClose"
    };
  }

  return Marionette.ItemView.extend({
    el: "#content",
    template: template,

    keyboardEvents: keyboardEvents,

    channelClose: function(e) {
      e.preventDefault();

      var current = $("li.channel-item.selected");
      if (current.length <= 0) return false;

      current.removeClass("selected");

      current.find(".part-channel").click();
    },

    channelMove: function(direction) {
      var current = $("li.channel-item.selected");
      if (current.length <= 0) return false;

      var next = current.next();
      var prev = current.prev();

      current.removeClass("selected");

      if (direction === "down") {
        if (next.length > 0) {
          next.addClass("selected").click();
        } else {
          $("li.channel-item:first").addClass("selected").click();
        }
      } else {
        if (prev.length > 0) {
          prev.addClass("selected").click();
        } else {
          $("li.channel-item:last").addClass("selected").click();
        }
      }
    },

    channelUp: function(e) {
      e.preventDefault();
      this.channelMove("up");
    },

    channelDown: function(e) {
      e.preventDefault();
      this.channelMove("down");
    },

    debug: function() {
      Komanda.vent.trigger("komanda:debug");
    },

    reload: function() {
      window.location.reload();
    }

  });

});
