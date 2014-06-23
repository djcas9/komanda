define([
  "bluebird",
  "jquery",
], function (Promise, $) {
  return function bootstrapEmbedTwitter (register) {
    register("twitter", /http(s)?:\/\/(.*\.)?twitter.com\/(\w+)\/status\/(\d+)/i, {
      title: "Twitter",
      enabled: true
    },
    function (link, settings) {
      var tweet = /http(s)?:\/\/(.*\.)?twitter.com\/(\w+)\/status\/(\d+)/i.exec(link.url);
      if (!tweet) return;
      var name = tweet[3];
      var id = tweet[4];
      if (!id) return;

      Promise.resolve($.ajax({
        url: "https://api.twitter.com/1/statuses/oembed.json?id=" + id,
        type: "get",
        dataType: "json"
      }))
      .then(function (data) {
        link.div.append(data.html.replace("src=\"//", "src=\"https://"));
      })
      .catch(function () {});
    });
  };
});
