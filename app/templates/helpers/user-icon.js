define("templates/helpers/user-icon", [
  "hbs/handlebars",
], function(Handlebars, _) {

  Handlebars.registerHelper("user-icon", function(text) {
    if (text === "&") {
      return "<i class=\"iconic\" data-glyph=\"globe\"></i>";
    } if (text === "~" || text === "!") {
      return "<i class=\"iconic\" data-glyph=\"flag\"></i>";
    } if (text === "@") {
      return "<i class=\"iconic\" data-glyph=\"shield\"></i>";
    } if (text === "%") {
      return "<i class=\"iconic\" data-glyph=\"contrast\"></i>";
    } else if (text === "+") {
      return "<i class=\"iconic\" data-glyph=\"bullhorn\"></i>";
    } else {
      return "<i class=\"iconic\" data-glyph=\"person-genderless\"></i>";
    }
  });

});

