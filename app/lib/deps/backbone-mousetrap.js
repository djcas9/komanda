define([
  'underscore',
  'backbone',
  'Mousetrap',
  'mousetrap-pause'
], function(_, Backbone, Mousetrap) {
    'use strict';

    var oldDelegateEvents = Backbone.View.prototype.delegateEvents;
    var oldUndelegateEvents = Backbone.View.prototype.undelegateEvents;
    var oldRemove = Backbone.View.prototype.remove;

    // Map from keyboard commands to the View instance that most recently bound each one.
    // so we can avoid accidentally unbinding keys when a view replaced a previous view's keybinding.
    var lastBound = {};

    _.extend(Backbone.View.prototype, {

        keyboardEvents: {},

        bindKeyboardEvents: function(events) {
            if (!(events || (events = _.result(this, 'keyboardEvents')))) return;
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
                if (!method) throw new Error('Method "' + events[key] + '" does not exist');
                method = _.bind(method, this);

                // Use global-bind plugin when appropriate
                // https://github.com/ccampbell/mousetrap/tree/master/plugins/global-bind
                if ('bindGlobal' in Mousetrap && (key.indexOf('mod') !== -1 || key.indexOf('command') !== -1 || key.indexOf('ctrl') !== -1)) {
                    Mousetrap.bindGlobal(key, method);
                } else {
                    Mousetrap.bind(key, method);
                }
                lastBound[key] = this;
            }
            return this;
        },

        unbindKeyboardEvents: function() {
            for (var keys in this.keyboardEvents) {
                if (lastBound[keys] === this) {
                    Mousetrap.unbind(keys);
                    delete lastBound[keys];
                }
            }
            return this;
        },

        delegateEvents: function() {
            var ret = oldDelegateEvents.apply(this, arguments);
            this.bindKeyboardEvents();
            return ret;
        },

        undelegateEvents: function() {
            var ret = oldUndelegateEvents.apply(this, arguments);
            if (this.unbindKeyboardEvents) this.unbindKeyboardEvents();
            return ret;
        },

        remove: function() {
            var ret = oldRemove.apply(this, arguments);
            if (this.unbindKeyboardEvents) this.unbindKeyboardEvents();
            return ret;
        }

    });
});
