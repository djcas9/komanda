define([
  "underscore",
  "bluebird",
  "lib/embed/image",
  "lib/embed/video",
  "lib/embed/gist",
  "lib/embed/jsfiddle",
], function (_, Promise, EmbedImage, EmbedVideo, EmbedGist, EmbedJsFiddle) {
  //var fs = Promise.promisifyAll(require('fs'));
  //var gui = require('nw.gui');
  //var path = require('path');

  return function bootstrapEmbed (Komanda) {
    Komanda.Embed = {};

    Komanda.Embed.register = function (name, match, settings, handler) {
      Komanda.Embed.list.push({
        name: name,
        match: match,
        handler: handler
      });

      if (!Komanda.settings.get("embeds." + name)) Komanda.settings.set("embeds." + name, settings);
    };

    Komanda.Embed.list = [];

    var handle_queue = [];
    var handle_timer;

    Komanda.Embed.handle = function (link) {
      handle_queue.push(link);

      startHandleTimer();
    };

    // Load embeds dynamically
    Komanda.Embed.reload = function () {
      /*fs.readdir(path.join(gui.App.dataPath, 'embeds').map(function (file) {
        require(file);
      })
      .catch(_.noop);*/
    };

    function startHandleTimer () {
      if (!handle_timer) setTimeout(handleNext, 50);
    }

    function handleNext () {
      var link = handle_queue.shift();

      if (link && link.selector) {

        link.div = $("div.embed-items", link.selector);

        if (link.div.length > 0) {
          _.chain(Komanda.Embed.list)
            .filter(function (embed) {
                if (_.isRegExp(embed.match) && embed.match.test(link.url)) return true;

                if (_.isFunction(embed.match)) return embed.match(link.url);
            })
            .filter(function (embed) {
              return Komanda.settings.get("embeds." + embed.name + ".enabled");
            })
            .forEach(function (embed) {
              link.div.css("display", "block");
              embed.handler(link, Komanda.settings.get("embeds." + embed.name));
            });
        }
      }    

      if (handle_queue.length > 0) startHandleTimer();
    }

    EmbedImage(Komanda.Embed.register);
    EmbedVideo(Komanda.Embed.register);
    EmbedGist(Komanda.Embed.register);
    EmbedJsFiddle(Komanda.Embed.register);

    Komanda.Embed.reload();
  };
});