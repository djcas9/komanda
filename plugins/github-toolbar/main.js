module.exports = function() {

  var hbs = require("hbs");
  var $ = require("jquery");
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

  $.support.cors = true;
  $.ajaxSettings.xhr = function() {
    return new XMLHttpRequest();
  }

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

      self.channelAPI.onChannelTopicChange(function (topic) {
        self.consumeTopic(topic);
      });
    },

    consumeTopic: function(topic) {
      var self = this;
      self.topic = topic;

      if (topic) {
        var match = topic.match(/http(s)?:\/\/.*\.?github.com\/(.[\w|\-|\/]+)/);

        if (match) {
          var key = match[2];

          if (key) {
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

          } else {
            // if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
            self.channelAPI.removeToolbar();
          } // has match index 3
        } else {
          // if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
          self.channelAPI.removeToolbar();
        } // has match
      } else {
        // if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
        self.channelAPI.removeToolbar();
      } // has topic
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

      $.ajax({
        url: self.metadataURL,
        dataType: "json",
        type: "get",
        ifModified: true,
        success: function(metadata) {
          if (metadata && !_.isEmpty(metadata)) {
            self.repo.metadata = metadata;
            self.pluginToolbar(self.repo);
          }

          if (callback && typeof callback === "function") {
            return callback(self.repo);
          }
        },
        error: function(a,b,c) {
          console.log("ERROR:::", a,b,c);
          if (errorback && typeof errorback === "function") {
            errorback(a,b,c);
          }
        }
      });
    },

    close: function() {
      var self = this;

      // if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
      self.channelAPI.removeToolbar();
    }
  }
}
