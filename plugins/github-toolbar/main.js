module.exports = function() {

  // Require all the node packages we depend on.
  var Promise = require("bluebird");
  var hbs = require("hbs");
  var $ = require("jquery");
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

  // These settings are required to activate jquery's CORS compatibility for cross-site AJAX requests.
  $.support.cors = true;
  $.ajaxSettings.xhr = function() {
    return new XMLHttpRequest();
  }

  // Load and compile the plugin's hbs template.
  var toolbarTemplate = require("./templates/toolbar.hbs");
  var GithubToolbar = hbs.compile(toolbarTemplate);

  return {
    initialize: function(args) {
      var self = this;
      if (_.has(args, "channelAPI")) {
        self.channelAPI = args.channelAPI;
      }

      self.metadataURL = "";
      self.toolbar = null;

      self.repo = {
        metadata: {}
      };

      // hook into the channel's topic change event
      self.channelAPI.onChannelTopicChange(function (topic) {
        self.consumeTopic(topic);
      });
    },

    consumeTopic: function(topic) {
      var self = this;
      self.topic = topic;

      if (topic) {
        var match = topic.match(/http(s)?:\/\/.*\.?github.com\/(.[\w|\-|\/]+)/);

        if (match && match[2]) {
          var key = match[2];

          var newMetadataURL = "";

          if (/\/$/.test(key)) {
            key = key.replace(/\/$/, "");
          }

          if (/\//.test(key)) {
            newMetadataURL = "https://api.github.com/repos/" + key;
          } else {
            newMetadataURL = "https://api.github.com/orgs/" + key;
          }

          // if the metadata url has changed, do an ajax call to retrieve new metadata
          if (self.metadataURL !== newMetadataURL) {
            self.metadataURL = newMetadataURL;
            self.updateAndRender();
          }

          return;
          }
        }

        self.channelAPI.removeToolbar();
    },

    pluginToolbar: function(repo) {
      var self = this;

      var params = {
        repo: repo,
        isOrg: false
      };

      if (_.has(repo.metadata, "type")) {
        if (repo.metadata.type === "Organization") {
          params.isOrg = true;
        }
      }

      var html = GithubToolbar(params);

      self.channelAPI.setToolbar(html);
    },

    updateAndRender: function(callback, errorback) {
      var self = this;

      if (!_.isFunction(callback)) callback = _.noop;
      if (!_.isFunction(errorback)) errorback = _.noop;

      Promise.resolve($.ajax({
        url: self.metadataURL,
        dataType: "json",
        type: "get",
        ifModified: true
      }))
      .then(function(metadata) {
        if (metadata && !_.isEmpty(metadata)) {
          self.repo.metadata = metadata;
          self.pluginToolbar(self.repo);
        }

        return self.repo;
      })
      .catch(errorback)
      .then(callback);
    },

    close: function() {
      var self = this;

      // if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
      self.channelAPI.removeToolbar();
    }
  }
}
