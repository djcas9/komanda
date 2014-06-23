define([], function () {
  return function bootstrapEmbedImage (register) {
    register("image", /\.(gif|png|jpe?g)$/i, {
      title: "Images",
      enabled: true
    },
    function (link) {
      link.div.append("<a href=\"" + link.url + "\" rel=\"nofollow\" target=\"_BLANK\"><img src=\"" + link.url + "\"></a>");
    });
  };
});
