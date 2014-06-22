define("templates/helpers/markdown", [
  "hbs/handlebars",
  "underscore"
], function(Handlebars, _) {

  var marked = requireNode("marked");

  marked.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false,
    highlight: function (code) {
      console.log("CODE", code);
      return requireNode("highlight.js").highlightAuto(code).value;
    }
  });

  Handlebars.registerHelper("markdown", function(text) {
    return marked(text);
  });

});

