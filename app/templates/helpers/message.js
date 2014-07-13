define("templates/helpers/message", [
  "app",
  "hbs/handlebars",
  "autolink"
], function(Komanda, Handlebars) {

  // TODO: move formatting code stuff to separate file which is referenced here
  var styles = {
    2: "irc-text-bold",
    15: "irc-text-normal",
    29: "irc-text-italic",
    31: "irc-text-underline"
  };

  var style = {
    current: [],
    isDirty: false,
    foreground: null,
    background: null,

    toggleClass: function (c) {
      if (!~this.current.indexOf(c)) {
        this.addClass(c);
      }
      else {
        this.removeClass(c);
      }
    },

    setColor: function (fg, bg) {
      if (!fg) return;

      this.removeClass("irc-text-foreground-" + this.foreground);
      this.addClass("irc-text-foreground-" + fg);
      this.foreground = fg;

      if (bg) {
        this.removeClass("irc-text-background-" + this.background);
        this.addClass("irc-text-background-" + bg);
        this.background = bg;
      }
    },

    addClass: function (c) {
      this.current.push(c);

      this.isDirty = true;
    },

    removeClass: function (c) {
      if (!c || !~this.current.indexOf(c)) return;

      this.current.splice(this.current.indexOf(c), 1);

      this.isDirty = true;
    },

    removeAllClasses: function () {
      this.current = [];

      this.foreground = null;
      this.background = null;

      this.isDirty = true;
    },

    flush: function () {
      if (this.isDirty) {
        this.isDirty = false;

        return "</span><span class=\"" + this.current.join(" ") + "\">";
      }

      return "";
    }
  };

  Handlebars.registerHelper("message", function(text, server, uuid) {
    var message = text;

    // TODO: move formatting code stuff to separate file which is referenced here
    message = (function (message) {
      var parsed = "<span>", c;

      for (var i = 0; i < message.length; i++) {
        c = message.charCodeAt(i);

        if (styles[c]) {
          if (c === 15) {
            style.removeAllClasses();
          }
          else {
            style.toggleClass(styles[c]);
          }
        }
        // color
        else if (c === 3) {
          console.log(message.substr(i + 1, 5));
          var parts = message.substr(i + 1, 5).split(",");
          var fg, bg;

          fg = parseInt(parts[0], 10);

          i += String(fg).length;

          if (parts.length > 1) {
            bg = parseInt(parts[1], 10);

            if (bg) {
              i += String(bg).length + 1;
            }
          }

          style.setColor(fg, bg);
        }
        else {
          parsed += style.flush() + message[i];
        }
      }
      
      style.removeAllClasses();
      style.flush();
      parsed += "</span>";

      return new Handlebars.SafeString(parsed);
    })(message);

    message = Handlebars.Utils.escapeExpression(message).autoLink({
      target: "_blank", rel: "nofollow",
      callback: function (url) {
        if (Komanda.Embed) Komanda.Embed.handle({ url: url, selector: "#" + server + "-" + uuid });

        return "<a href=\"" + url + "\" rel=\"nofollow\" target=\"_BLANK\">" + url + "</a>";
      }
    });
    
    return new Handlebars.SafeString(message);
  });
});
