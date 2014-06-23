define([
  "hbs!templates/partials/show-more"
], function (ShowMore) {
  return function bootstrapEmbedJsFiddle (register) {
    register("jsfiddle", /jsfiddle\.net\/(.+)$/i, {
      title: "jsFiddles",
      enabled: true
    },
    function (link, settings) {
      link.div.append(ShowMore({
        icon: "code",
        title: "Toggle Attached Items",
        ele: link.selector,
        show: ".jsfiddle-holder"
      }));

      link.div.append("<div class=\"jsfiddle-holder\"><iframe nwdisable nwfaketop style=\"width: 600px; height: 400px\" src=\"" + link.url + (link.url.slice(-1) === "/" ? "" : "/") + "embedded\"></iframe></div>");
    });
  };
});
