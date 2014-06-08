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
      // this.listenTo(this.model, 'change', this.render);
    },

    toggleSession: function(e) {
      e.preventDefault();
      $(e.currentTarget).parents('.session').find('.channel-list').toggle();
    },

    onRender: function() {
      var $this = $(this.el);
      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-id', this.model.get('uuid'));
    }

  });

});
