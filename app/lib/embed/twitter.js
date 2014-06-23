define([
  "bluebird",
  "jquery",
], function (Promise, $) {
  return function bootstrapEmbedTwitter (register) {
    register("twitter", /twitter/i, {
      title: "Twitter",
      enabled: true
    },
    function (link, settings) {
      var match = link.url.match(/http(s)?:\/\/(.*\.)?twitter.com\/(\w+)\/status\/(\d+)/i);
      var name = match[3];
      var id = match[4];
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
