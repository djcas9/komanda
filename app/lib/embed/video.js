define([], function () {
  return function bootstrapEmbedVideo (register) {
    register("video", /\.webm$/i, {
      title: "Videos",
      enabled: true,
      autoplay: { type: "checkbox", value: false },
      loop: { type: "checkbox", value: true },
      volume: { type: "text", value: 0 }
    },
    function (link, settings) {
      var video = $("<video src=\"" + link.url + "\" style=\"max-width: 600px; max-height: 400px\"></video>");

      video.prop("controls", true)
           .prop("autoplay", settings.autoplay.value)
           .prop("loop", settings.loop.value)
           .prop("volume", settings.volume.value);

      link.div.append(video);
    });
  };
});
