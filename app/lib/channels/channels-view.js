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
      "click li.channel-item": "openChannel",
      "click i.part-channel": "partChannel"
    },

    initialize: function() {
    },

    bind: function() {
      $("ul.channels").sortable({
        axis: "y",
        handle: "li.channel-item"
      });
      $("ul.channels").disableSelection();
    },

    partChannel: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var item = $(e.currentTarget).parent('.channel-item');
      var channel = item.attr('data-name');
      var server = item.attr('data-server-id');

      if (!server) {
        server = item.parents('.session').attr('data-id');
      }

      Komanda.store[server].count[channel] = 0;
      Komanda.vent.trigger(server + ":part", channel);
    },

    openChannel: function(e) {
      var self = this;
      e.preventDefault();

      $('.channel-holder .channel').hide();

      var item = $(e.currentTarget);
      var channel = item.attr('data-name');
      var server = item.attr('data-server-id');

      if (!server) {
        server = item.parents('.session').attr('data-id');
      }

      if (Komanda.store.hasOwnProperty(server)) {
        if (Komanda.store.hasOwnProperty(channel)) {
          Komanda.store[server][channel] = 0;

          if (Komanda.store[server].hasOwnProperty('count')) {
            Komanda.store[server].count[channel] = 0;
          } else {
            Komanda.store[server].count = {}
            Komanda.store[server].count[channel] = 0;
          }

        } else {
          Komanda.store[server][channel] = 0;

          if (Komanda.store[server].hasOwnProperty('count')) {
            Komanda.store[server].count[channel] = 0;
          } else {
            Komanda.store[server].count = {}
            Komanda.store[server].count[channel] = 0;
          }
        }
      } else {
        Komanda.store[server] = {
          count: {}
        };
        Komanda.store[server][channel] = 0;
        Komanda.store[server].count[channel] = 0;
      }

      Komanda.store[server].count[channel] = 0;
      Komanda.vent.trigger('komanda:update:badge');

      item.find('div.status').removeClass('new-messages');
      item.find('div.status').removeClass('highlight');
      $('li.channel-item').removeClass('selected');
      item.addClass('selected');

      Komanda.current = {
        server: server,
        channel: channel
      };

      var select = '.channel-holder .channel[data-server-id="'+server+'"][data-name="'+channel+'"]';
      $(select).show();

      var objDiv = $(select).find('.messages').get(0);
      if (objDiv) objDiv.scrollTop = objDiv.scrollHeight;

      $(select).find('input').val("").focus();
    },

    getEmptyView: function() {}
  });

});
