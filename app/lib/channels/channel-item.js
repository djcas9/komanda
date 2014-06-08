define([
  "marionette", 
  "hbs!templates/channel-item",
], function(Marionette, template) {

  return Marionette.ItemView.extend({
    tagName: 'li',
    className: "channel-item",
    template: template,

    events: {
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.channelItemUpdate);
      this._modelBinder = new Backbone.ModelBinder();
    },

    onClose: function() {
      this._modelBinder.unbind();
    },

    channelitemUpdate: function() {
      this.render();
    },

    onRender: function() {
      var $this = $(this.el);
      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-name', this.model.get('channel'));

      var server = $this.attr('data-server-id');

      if (!server) {
        server = $this.parents('.session').attr('data-id');
      }

      if (Komanda.store.hasOwnProperty(server)) {
        if (Komanda.store[server].hasOwnProperty('current_channel')) {
          $('li.channel-item').removeClass('selected');
          $('li.channel-item[data-server-id="'+server+'"][data-name="'+Komanda.store[server].current_channel+'"]').addClass('selected');
        }
      }
    }
  });

});
