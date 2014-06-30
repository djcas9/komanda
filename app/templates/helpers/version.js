define("templates/helpers/version", [
  "hbs/handlebars",
  "underscore",
  "helpers"
], function(Handlebars) {

  Handlebars.registerHelper("version", function(obj) {
    return Komanda.version;
  });

});

