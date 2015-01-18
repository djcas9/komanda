define([
  "underscore",
  "bluebird"
], function (_, Promise) {
  
  var fs = Promise.promisifyAll(requireNode("fs"));
  var path = requireNode("path");

  var PluginLoader = {
    loadPlugins: function () {
      /*
      ** 1- Looks in the plugin directory for a plugins.json file
      ** 2- Parses it out and looks for valid plugins defined within
      ** 3- Loads the plugin via node's require() module
      ** 4- Adds the plugin and its settings to the Komanda.settings.plugins array.
      */
      
      // Clear all plugins if any:
      Komanda.settings.plugins = [];

      return Promise.all([
        PluginLoader.getPluginsForDir(process.cwd()), // Compiled Root
        PluginLoader.getPluginsForDir(process._nw_app.dataPath) // DataPath
      ])
      .then(function (p) {
        return _.chain(p)
        .flatten()
        .map(function (plugin) {
          plugin.name = plugin.package.komanda.name || plugin.package.name;
          plugin.version = plugin.package.version;

          return plugin;
        })
        .value();
      })
      // if multiple of the same plugin are loaded, take the newest version
      .then(function (plugins) {
        var pluginsByNameVersion = _.reduce(plugins, function (memo, plugin) {
          if (!memo[plugin.name]) memo[plugin.name] = [];

          memo[plugin.name].push(plugin);

          memo[plugin.name] = _.sortBy(memo[plugin.name], "version").reverse(); // TODO: use semver, this will fail easily

          return memo;
        }, {});

        //console.log(pluginsByNameVersion);

        plugins = _.reduce(pluginsByNameVersion, function (memo, pluginList, key, plugins) {
          memo.push(pluginList[0]);

          return memo;
        }, []);

        //console.log(plugins);

        return plugins;
      })
      .each(function (plugin) {
        console.log("Loading Plugin:", plugin.name, plugin.version);

        var main = path.join(plugin.path, plugin.package.komanda.main);
        var plug = requireNode(main);
      
        // Add the plugin info that we need to Komanda settings.
        var pluginobj = {
          name: plugin.name,
          channel: plugin.package.komanda.channel || false,
          plugin: plug
        };

        // if a stylesheet path was provided verify it exists before adding it to the plugin info.
        if (plugin.package.komanda.stylesheet) {
          var stylesheetpath = path.join(plugin.path, plugin.package.komanda.stylesheet);

          pluginobj.stylesheetPath = stylesheetpath;
        }

        Komanda.settings.addPlugin(pluginobj);
      });
    },

    getPluginsForDir: function (dirPath, b) {
      var pluginsRoot = path.join(dirPath, "plugins");
      console.log("Loading Plugin Dir:", path.resolve(pluginsRoot));

      return fs.readdirAsync(pluginsRoot)
      .catch(function () {
        return [];
      })
      .filter(function (entry) {
        return fs.lstatAsync(path.join(pluginsRoot, entry)).then(function (stats) {
          return stats.isDirectory() || stats.isSymbolicLink();
        })
        // if a file can't be stat
        .catch(function () {
          return false;
        });
      })
      .map(function (plugin) {
        var packagePath = path.join(pluginsRoot, plugin, "package.json");

        return fs.readFileAsync(packagePath)
        .then(JSON.parse)
        .then(function (package) {
          if (!package.komanda || package.komanda.disabled) return false;

          return { 
            path: path.join(pluginsRoot, plugin),
            package: package
          };
        })
        .catch(function () {
          return false;
        });
      })
      .filter(function (plugin) {
        return plugin;
      });
    }
  };

  return PluginLoader;
});
