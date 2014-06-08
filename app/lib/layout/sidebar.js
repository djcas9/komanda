define(["marionette", "hbs!templates/layout/sidebar"], function(Marionette, template) {

  return Marionette.ItemView.extend({
    el: "#sidebar",
    template: template
  });

});
