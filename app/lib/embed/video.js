define([
  "hbs!templates/partials/show-more"
], function (ShowMore) {
  return function bootstrapEmbedVideo (register) {
    register("video", /\.(webm|gifv)$/i, {
      title: "Videos",
      enabled: true,
      autoplay: { type: "checkbox", value: false },
      loop: { type: "checkbox", value: true },
      volume: { type: "text", value: 0 }
    },
    function (link, settings) {
      var url = link.url;
      // Special handling for gifv, which should be rewritten to webm as it is not supported by the video tag
      if (String(url).match(/\.gifv$/i)) {
        url = (String(url).replace(/\.gifv$/i,".webm"));
      }
      var video = $("<video src=\"" + url + "\" style=\"max-width: 600px; max-height: 400px\"></video>");

      video.prop("controls", true)
           .prop("autoplay", settings.autoplay.value)
           .prop("loop", settings.loop.value)
           .prop("volume", settings.volume.value);

      link.div.append(ShowMore({
        icon: "code",
        title: "Toggle Attached Video",
        ele: link.selector,
        show: ".video-holder"
      }));

      link.div.append($(video).wrap("<div class=\"video-holder\"></div>").parent());
    });
  };
});
