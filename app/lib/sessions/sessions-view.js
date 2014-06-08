define([
  "marionette",
  "hbs!templates/sessions",
  "lib/sessions/session-view",
  "lib/sessions/session"
], function(Marionette, template, SessionView, Session) {

  return Marionette.CompositeView.extend({
      template: template,
      itemView: SessionView,
      itemViewContainer: ".sessions-wrapper",

      events: {
      },

      onRender: function() {
      },

      getEmptyView: function() {}
    });

});
