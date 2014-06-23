define([
  "gistembed",
  "hbs!templates/partials/show-more"
], function (GIST, ShowMore) {
  return function bootstrapEmbedGist (register) {
    register("gist", /gist\.github\.com/i, {
      title: "Github Gists",
      enabled: true
    },
    function (link, settings) {
      var gist = /gist.github.com\/((-|\w)+)\/(.+)$/i.exec(link.url);

      if (gist !== null && gist.length === 4) {
        var gistUser = gist[1];
        var gistID = gist[3];

        link.div.append(ShowMore({
          icon: "code",
          title: "Toggle Attached Code Sample",
          ele: link.selector,
          show: ".gist"
        }));

        GIST.load(link.div, gistID);
      }
    });
  };
});
