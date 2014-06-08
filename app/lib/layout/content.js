define(["marionette", "hbs!templates/layout/content"], function(Marionette, template) {

  return Marionette.ItemView.extend({
    el: "#content",
    template: template
  });

});
