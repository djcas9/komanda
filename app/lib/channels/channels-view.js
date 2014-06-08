define([
  "marionette",
  "hbs!templates/channels",
  "lib/channels/channel-item",
  "lib/channels/channel"
], function(Marionette, template, ChannelView, Channel) {

  return Marionette.CompositeView.extend({
    className: "channel-list",
    template: template,
    itemView: ChannelView,
    itemViewContainer: "ul.channels",

    events: {
      "click li.channel-item": "openChannel"
    },

    openChannel: function(e) {
      e.preventDefault();

      $('.channel-holder .channel').hide();

      var item = $(e.currentTarget);

      var channel = item.attr('data-name');
      var server = item.attr('data-server-id');

      if (!server) {
        server = item.parents('.session').attr('data-id');
      }

      $('li.channel-item').removeClass('selected');
      item.addClass('selected');

      if (!Komanda.store.hasOwnProperty(server)) Komanda.store[server] = {};
      Komanda.store[server].current_channel = channel;
      Komanda.store.current_server = server;

      var select = '.channel-holder .channel[data-server-id="'+server+'"][data-name="'+channel+'"]';
      $(select).show();

      var objDiv = $(select).find('.messages').get(0);
      objDiv.scrollTop = objDiv.scrollHeight;
    },

    onRender: function() {
      var server = Komanda.store.current_server;

      if (Komanda.store.hasOwnProperty(server)) {
        if (Komanda.store[server].hasOwnProperty('current_channel')) {
          $('li.channel-item').removeClass('selected');
          $('li.channel-item[data-server-id="'+server+'"][data-name="'+Komanda.store[server].current_channel+'"]').addClass('selected');
        }
      }
    },

    getEmptyView: function() {}
  });

});
