define("templates/helpers/timestamp", [
  "app",
  "hbs/handlebars",
  "moment"
], function(Komanda, Handlebars, moment) {
  Handlebars.registerHelper("timestamp", function (timestamp) {
    return moment(timestamp || Date.now()).format(Komanda.settings.get("display.timestamp"));
  });
});
