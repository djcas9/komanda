define([
  "marionette", 
  "hbs!templates/session",
], function(Marionette, template) {

  return Marionette.ItemView.extend({
    tagName: 'div',
    className: "session",
    template: template,

    events: {
      "click .server": "toggleSession"
    },

    initialize: function() {
    },

    toggleSession: function(e) {
      e.preventDefault();
      var parent = $(e.currentTarget).parents('.session')
      parent.find('.channel-list').toggle();
      parent.find('.server-metadata').toggle();
    },

    onRender: function() {
      var $this = $(this.el);
      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-id', this.model.get('uuid'));
    }

  });

});
