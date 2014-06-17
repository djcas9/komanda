define([
  "marionette",
  "hbs!templates/sessions",
  "lib/sessions/session-view",
  "lib/sessions/session",
  "jquery",
  "jquery-ui"
], function(Marionette, template, SessionView, Session, $) {

  return Marionette.CompositeView.extend({
      template: template,
      itemView: SessionView,
      itemViewContainer: ".sessions-wrapper",

      events: {
      },

      onRender: function() {
      },

      onShow: function() {
        $("div.sessions-wrapper").sortable({
          axis: "y",
          handle: ".server"
        });
        $("div.sessions-wrapper").disableSelection();
      },

      getEmptyView: function() {}
    });

});
