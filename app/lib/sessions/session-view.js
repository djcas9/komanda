define([
  "marionette", 
  "hbs!templates/session",
], function(Marionette, template) {

  return Marionette.ItemView.extend({
    tagName: 'div',
    className: "session",
    template: template,

    events: {
      "click .server .server-inside": "toggleSession"
    },

    modelEvents: {
      'change': 'updateName'
    },

    initialize: function() {
    },

    updateName: function() {
      var item = $(this.el);
      item.find('span.server-name').html(this.model.get('name'));
    },

    toggleSession: function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();

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
