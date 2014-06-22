define("templates/helpers/messages-id", [
  "hbs/handlebars",
  "underscore"
], function(Handlebars, _) {

  Handlebars.registerHelper("messages-id", function(obj) {
    return "messages-" + this.server + "-" + (this.status ? "status" : this.channel.replace(/\#+/, "komanda-"));
  });

});

