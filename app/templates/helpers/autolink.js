define("templates/helpers/autolink", [
  "app",
  "hbs/handlebars",
  "underscore",
  "jquery",
  "gistembed",
  "hbs!templates/partials/show-more",
  "autolink"
], function(Komanda, Handlebars, _, $, GIST, ShowMore) {

  Handlebars.registerHelper("autolink", function(text, server, uuid) {

    var message = Handlebars.Utils.escapeExpression(text).autoLink({
      target: "_blank", rel: "nofollow",
      callback: function (url) {
        if (Komanda.Embed) Komanda.Embed.handle({ url: url, selector: "#" + server + "-" + uuid });

        return "<a href=\"" + url + "\" rel=\"nofollow\" target=\"_BLANK\">" + url + "</a>";
      }
    });
    
    return new Handlebars.SafeString(message);
  });
});
