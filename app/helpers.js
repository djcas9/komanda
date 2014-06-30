define([
  "jquery",
  "underscore",
  "highlight"
], function($, _, hljs) {
  
  var Helpers = {
    scrollUpdate: function(channel, force, delay) {
      var objDiv = channel.get(0);

      if (objDiv) {
        var value = (channel.scrollTop() + channel.innerHeight() > objDiv.scrollHeight - 100);

        if (value || force) {
          setTimeout(function() {
            objDiv.scrollTop = objDiv.scrollHeight;
          }, _.isNumber(delay) ? delay : 100);
        }
      }
    },

    init: function() {
      hljs.initHighlightingOnLoad();
    },

    displayCode: function(code, server, target) {
      hljs.configure({useBR: true});
      return hljs.highlightAuto(code).value;
    },

    updateBadgeCount: function() {
      Komanda.vent.trigger("komanda:update:badge");
    },

    expandURL: function(url) {
      var expander = {
        expand: function (url, callback) {
          $.ajax({
            dataType: "jsonp",
            url: "http://api.longurl.org/v2/expand",
            data: {
              url: url,
              format: "json"
            },
            success: function(response) {
              callback(response);
            }
          });
        }
      };

      expander.expand(url, function(response) {
        console.dir(response);
        return response;
      });
    },

    loadTheme: function(settings, callback) {
      var key = settings.themes.current; 

      if (settings.themes.list.hasOwnProperty(key)) {
        $("head link#theme").remove();
        var path = settings.themes.list[key].css;
        var css = "<link id=\"theme\" rel=\"stylesheet\" href=\"" + path + "\">";
        $("head").append(css);

        if (_.isFunction(callback)) {
          setTimeout(callback, 300);
        }
      }
    },
    limp: {
      box: function(template, data, args) {
        var self = this;

        if (args && args.width) {
          Helpers.limp.options.style.width = args.width;
        }

        Helpers.limp.options.afterDestory = args.afterDestory;

        var options = $.extend({}, Helpers.limp.options, args);

        options.template = template;
        options.templateData = data;

        var box = $.limp(options);

        return box;
      },

      options: {
        cache: false,
        adjustmentSize: 0,
        loading: true,
        alwaysCenter: true,
        animation: "pop",
        shadow: "0 0px 20px rgba(0,0,0,0.5)",
        round: 3,
        distance: 10,
        overlayClick: true,
        enableEscapeButton: true,
        dataType: "html",
        centerOnResize: true,
        closeButton: true,
        style: {
          "-webkit-outline": 0,
          color: "#000",
          position: "fixed",
          border: "none",
          outline: 0,
          zIndex: 1000001,
          opacity: 0,
          // overflow: "auto",
          background: "transparent"
        },
        inside: {
          background: "transparent",
          padding: "0",
          display: "block",
          border: "1px solid #000",
          overflow: "visible"
        },
        overlay: {
          background: "#151a1f",
          opacity: 0.9
        },
        onTemplate: function(template, data, limp) {

          try {
            var $html = template(data);
            if ($html.length > 0) { return $html; }
            return false;
          } catch(e) {
            console.error(e);
            return false;
          }

        }
      } // limp options
    }
  };

  return Helpers;
});
