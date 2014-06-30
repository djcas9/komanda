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

    toggleSystemMessage: function (show) {
      $("head style#display-system").remove();
      if (!show) {
        var style = $("<style id=\"display-system\" type=\"text/css\">");
        $("head").append(style);
        style[0].sheet.insertRule("div.message.system-message { display: none; }", 0);
      }
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
    },

    loadPlugins: function() {
      /*
      ** 1- Looks in the plugin directory for a plugins.json file
      ** 2- Parses it out and looks for valid plugins defined within
      ** 3- Loads the plugin via node's require() module
      ** 4- Adds the plugin and its settings to the Komanda.settings.plugins array.
      */

      // Load the fs and path node modules we will be needing.
      var fs = requireNode("fs");
      var path = requireNode("path");
      
      // Clear all plugins if any:
      Komanda.settings.plugins = [];

      // For now we consider the app dataPath as the root of the plugins folder.
      var appDataPath = process._nw_app.dataPath; // TODO: replace with a path stored in Komanda.settings: settings.get('pluginsFolder');

      // Construct the path to the plugins configuration file at <appdata>/plugins/plugins.json.
      var pluginRoot = path.join(appDataPath, "plugins");
      var pluginJSONPath = path.join(pluginRoot, "plugins.json");

      // Check that the plugins.json file exists where it should be.
      if (!fs.existsSync(pluginJSONPath)) {
        return;
      }

      // Read the plugins.json file from the provided path.
      var pluginSettings = JSON.parse(fs.readFileSync(pluginJSONPath, "utf8"));

      // Check that it isn't empty.
      if (pluginSettings.length < 1) {
        return;
      }

      // Load each plugin:
      for (var i = 0; i < pluginSettings.length; i++) {
        // The only required field is the plugin name.
        if (!pluginSettings[i].name) {
          continue;
        }

        // if the plugin is disabled don't load it
        if (pluginSettings[i].disabled) {
          continue;
        }

        // Build the path to this plugin and verify it exists.
        var pluginpath = path.join(pluginRoot, pluginSettings[i].location, pluginSettings[i].main);
        if (!fs.existsSync(pluginpath)) {
          return;
        }

        // use node's require module to acquire the plugin module.
        var plug = requireNode(pluginpath);
        
        // Add the plugin info that we need to Komanda settings.
        var pluginobj = {
          "name": pluginSettings[i].name,
          "channel": pluginSettings[i].channel || false,
          "topic": pluginSettings[i].topic || false,
          "plugin": plug
        };

        // if a stylesheet path was provided verify it exists before adding it to the plugin info.
        if (pluginSettings[i].stylesheet) {
          var stylesheetpath = path.join(pluginRoot, pluginSettings[i].location, pluginSettings[i].stylesheet);
          if (fs.existsSync(stylesheetpath)) {
            pluginobj.stylesheetPath = stylesheetpath;
          }
        }

        Komanda.settings.addPlugin(pluginobj);
      }

    }
  };

  return Helpers;
});
