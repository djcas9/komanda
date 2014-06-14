(function($) {

  function Limp(element, options) {
    var self = this;

    self.options = options;
    self.$element = $(element);

    self.inProgress = false;
    self.template = self.options.template || null;
    self.templateData = self.options.templateData || {};
    self.content = self.options.content || null;

    self.url = self.options.url || null;
    self.$limp = false;

    self.$loader = false;
    self.cache = false;

    if (self.$element.data('template')) {
      self.template = self.$element.data('template');
    };

    if (self.$element.data('width')) {
      self.options.style.width = self.$element.data('width');
    };

    // Ajax Request
    if (!self.template) {

      if (self.$element.attr('href')) {
        self.url = self.$element.attr('href');
      } else if (self.$element.data('url')) {
        self.url = self.$element.data('url');
      };

    };

    return self;
  };

  Limp.prototype = {

    open: function() {
      var self = this;
      if (self.inProgress) { return };
      self.inProgress = true;
      self.limp();

      $(document).bind('limp.close', function() {
        self.close();
      });

      self.enableEscapeButtonHandler = function(e) {
        e.stopPropagation();
        if (e.keyCode == 27) { self.close() };
      };

      self.onActionHandler = function(e) {
        e.stopPropagation();
        if (e.keyCode == 13) {
          var $button = $('button.limp-action');
          if ($button) {
            $button.click();
          };
        };
      };

      if (self.options.enableEscapeButton) {
        $(document).bind('keydown', self.enableEscapeButtonHandler);
      };

      self.$overlay.prependTo('body');

      self.fetch(function(content) {
        self.visible = true;

        self.options.onOpen(self);

        if (self.options.overlayClick) {

          self.$overlay.bind('click', function(event) {
            event.preventDefault();
            self.close();
          });

        };

        if (self.options.centerOnResize) {

          $(window).bind('limp.resize', function(e) {
            if (self.visible) { self.resize() };
          });

        };


        self.$limp.find('#limp-box-inside').html(content);

        self.$limp.css({
          maxHeight: $(window).height() - (self.options.distance * 2),
          display: 'block'
        }).prependTo('body');


        self.options.afterOpen(self, self.$limp);

        // Animations
        if (self.options.animation == 'pop') {

          self.$overlay.animate({
            opacity: self.options.overlay.opacity
          }, 'fast');

          var position = self.resize(200);

          self.$limp.animate({
            top: position.height,
            opacity: 1
          }, 400);

          self.onClose = function(that, callback) {
            self.$overlay.fadeOut('fast');
            self.$limp.animate({
              top: position.offsetHeight,
              opacity: 0
            }, 400, function() {
              callback();
            });
          };

        } else if (self.options.animation == 'fade') {

          self.resize();

          self.$limp.animate({
            opacity: 1
          }, 'fast');

          self.$overlay.animate({
            opacity: self.options.overlay.opacity
          }, 'fast');

          self.onClose = function(that, callback) {
            self.$overlay.fadeOut('fast');
            that.$limp.fadeOut('fast', function() {
              callback();
            });
          };

        } else {

          // self.$overlay.fadeTo(0, self.options.overlay.opacity);
          self.$overlay.css({opacity:0.8});

          self.resize();

          self.$limp.css('opacity', 1);

          self.onClose = function(that, callback) {
            callback();
          };

        };

        self.$limp.data('limp-api', self);


        if (!self.options.disableDefaultAction) {
          $(document).bind('keydown', self.onActionHandler);
        };

        if (self.options.onAction && (typeof self.options.onAction === "function")) {
          $('.limp-action', self.$limp).bind('click', function(e) {
            e.preventDefault();
            self.options.onAction();
          });
        };

      });

      return self;
    },

    resize: function(offset) {
      var self = this;

      var offsetHeight = 0;


      var screenh = ($(window).height() / 2);
      var screenw = ($(window).width() / 2);

      if (typeof self.limpStartSize === "undefined") {
        self.limpStartSize = self.$limp.outerHeight(true);
      };

      if (self.options.adjustmentSize) {

        if (self.limpStartSize < 500) {

          if ($(window).height() > 400) {
            var height = (screenh - self.options.adjustmentSize)
            - (self.$limp.outerHeight(true) / 2);

            if (height <= self.options.adjustmentSize) { height = self.options.adjustmentSize };
          } else {
            var height = (screenh - (self.$limp.outerHeight(true) / 2));
          };

        } else {
          var height = (screenh - (self.$limp.outerHeight(true) / 2));
        };

      } else {

        var height = (screenh - (self.$limp.outerHeight(true) / 2));

      };

      var width = (screenw - (self.$limp.outerWidth(true) / 2));

      if (offset) {

        offsetHeight = height + offset;

      } else {

        offsetHeight = height;

      };

      self.$limp.css({
        maxHeight: $(window).height() - (self.options.distance * 2),
        top: offsetHeight,
        left: width
      });

      var resizeData = {
        height: height,
        width: width,
        offset: offset,
        offsetHeight: offsetHeight
      };

      return resizeData;
    },

    close: function() {
      var self = this;

      self.inProgress = false;
      self.onClose(self, function() { self.clean() });

      return self;
    },

    clean: function() {
      var self = this;

      self.visible = false;
      self.$limp.css('opacity', 0);

      $(window).unbind('limp.resize');

      $(document).unbind('keydown', self.enableEscapeButtonHandler);
      $(document).unbind('keydown', self.onActionHandler);
      $(document).unbind('limp.close');

      self.options.onOpen(self);
      self.$limp.remove();

      self.$overlay.remove();

      if (self.options.hasOwnProperty('afterClose')) {
        self.options.afterClose(self, self.$limp);
      }

      self.options.afterDestroy(self, self.$limp);

    },

    error: function(xhr, textStatus, errorThrown) {
      var self = this;

      var $error = $('<span class="limp-box-error" />');

      try {

        var status = textStatus.charAt(0).toUpperCase() + textStatus.slice(1);
        var message = $error.append('' + status + ': ' + errorThrown + '.');

      } catch(err) {

        var status = textStatus;

        var html = "<div class='limp-error-box'><div class='limp-error-box-title'><div class='icon' />Loading Error</div><div class='limp-error-box-content'><span>Error: Not Found</span></div>" +
        "<div class='limp-error-box-footer'><div class='form-actions'><button class='form-button default' onClick='$.limpClose()'>Ok</button></div></div>" +
        "</div>";

        var message = $error.append(html);

      };

      return message;
    },

    fetch: function(callback) {
      var self = this;

      // self.loading();

      if ($.fn.limp.loading) {
        $.fn.limp.loading.remove();
        $.fn.limp.loading = false;
      }

      if (self.url) {

        if (self.cache && self.options.cache) {

          callback(self.cache);

        } else {

          $.ajax({
            url: self.url,
            type: 'GET',
            dataType: self.options.dataType,
            success: function(data, textStatus, xhr) {
              self.cache = data;
              callback(data);
            },
            error: function(xhr, textStatus, errorThrown) {
              self.cache = false;
              callback(self.error(xhr, textStatus, errorThrown));
            }
          });

        };

      } else if (self.template) {

        if (self.options.onTemplate && (typeof self.options.onTemplate === "function")) {

          self.cache = self.options.onTemplate(self.template, self.templateData, self);

          if (self.cache) {

            callback(self.cache);

          } else {

            callback(self.error());

          };

        };

      } else if (self.content) {

         self.cache = self.content;

          if (self.cache) {

            callback(self.cache);

          } else {

            callback(self.error());

          };

      } else {

        callback(self.error());

      };

      return false;
    },
      
    limp: function() {
     var self = this;

      if (!self.$limp) {

        self.$overlay = $('<div id="limp-box-overlay" />').css({
          background: self.options.overlay.background,
          opacity: 0,
          position: 'fixed',
          display: 'block',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000000
        });

        self.$limp = $('<div id="limp-box" />');
        self.$limpInside = $('<div id="limp-box-inside" />');

        self.$limpInside.css(self.options.inside).appendTo(self.$limp);

        if (self.options.closeButton) {

          var $limpClose = $('<div id="limp-box-close" ' +
          'class="limp-box-close"><div class="limp-box-close-icon" /><i class="iconic" data-glyph="x"></div>').css({
            position: 'absolute',
            display: 'block',
            top: 15,
            right: 18,
            height: 22,
            width: 22,
            cursor: 'pointer',
            position: 'absolute',
            color: '#999',
            'line-height': '10px',
            'font-size': '18px'
          });

          $limpClose.appendTo(self.$limp);

          $('body').on('click', '.limp-box-close', function(event) {
            event.preventDefault();
            $(document).trigger('limp.close');
          });
        };

        self.css();
      };

      $(window).resize(function() {
        self.$limp.trigger('limp.resize');
      });

      return self.$limp;
    },

    css: function() {
      var self = this;

      self.$limp.css(self.options.style);

      if (self.options.shadow) { self.shadow() };

      if (self.options.round) { self.round() };

    },

    shadow: function(){
      var self = this;

      self.$limp.css({
        '-webkit-box-shadow': self.options.shadow,
        '-moz-box-shadow': self.options.shadow,
        'box-shadow': self.options.shadow
      });

    },

    round: function(){
      var self = this;

      self.$limp.css({
        'border-radius': self.options.round,
        '-moz-border-radius': self.options.round,
        '-webkit-border-radius': self.options.round
      });

      self.$limp.find('#limp-box-inside').css({
        'border-radius': self.options.round,
        '-moz-border-radius': self.options.round,
        '-webkit-border-radius': self.options.round
      });

    },

    loading: function() {
      var self = this;
      $.fn.limp.loading.remove();
      $.fn.limp.loading = false;
    }

  };

  $.limpClose = function() {
    $(document).trigger('limp.close');
    return false;
  };

  $.limp = function(options) {
    options = $.extend({}, $.fn.limp.defaults, options);
    options.style = $.extend({}, $.fn.limp.style, options.style);
    options.overlay = $.extend({}, $.fn.limp.overlay, options.overlay);
    options.inside = $.extend({}, $.fn.limp.inside, options.inside);
    var limp = new Limp(null, options);
    return limp;
  };

  $.fn.limp = function(options) {
    var limps = [];

    options = $.extend({}, $.fn.limp.defaults, options);
    options.style = $.extend({}, $.fn.limp.style, options.style);
    options.overlay = $.extend({}, $.fn.limp.overlay, options.overlay);
    options.inside = $.extend({}, $.fn.limp.inside, options.inside);

    function fetch(ele) {
      var obj = $.data(ele, 'limp');

      if (!obj) {

        obj = new Limp(ele, options);

        $.data(ele, 'limp', obj);

        limps.push(obj);

      };

      return obj;
    };

    function toggle(event) {
      event.preventDefault();
      var limp = fetch(this);

      if (limp.visible) {
        limp.close();
      } else {
        limp.open();
      };

    };
    
    $(document).on('click', this.selector, toggle);
    
    return this;
  };

  $.fn.limp.defaults = {
    cache: false,
    disableDefaultAction: false,
    adjustmentSize: null,
    loading: true,
    alwaysCenter: true,
    round: 0,
    animation: false,
    shadow: "0 1px 10px rgba(0,0,0,0.2)",
    distance: 50,
    overlayClick: true,
    enableEscapeButton: true,
    dataType: 'html',
    centerOnResize: true,
    closeButton: true,
    onOpen: function(limp) {},
    afterOpen: function(limp, html) {},
    onClose: function(limp) {},
    onTemplate: function(template, limp) {}
  };

  $.fn.limp.style = {
    '-webkit-outline': 0,
    background: '#fff',
    color: '#000',
    position: 'fixed',
    width: '700px',
    border: 'solid 5px #ededed',
    color: 'black',
    outline: 0,
    zIndex: 1000001,
    opacity: 0,
    height: 'auto',
    overflow: 'visible'
  };

  $.fn.limp.inside = {
    background: '#fff',
    padding: '35px 40px',
    display: 'block',
    border: '1px solid #ddd',
    overflow: 'visible'
  };

  $.fn.limp.overlay = {
    background: '#fff',
    opacity: 0.4
  };

  $.fn.limp.loading = false;

  $.limpLoading = function() {

      if ($.fn.limp.loading) {
        $.fn.limp.loading.remove();
        $.fn.limp.loading = false;
      } else {
        $.fn.limp.loading = $('<div id="limp-box-loading" />');
        $.fn.limp.loading.css({
        'border-radius': 5,
        '-moz-border-radius': 5,
        '-webkit-border-radius': 5,
          width: '21px',
          height: '16px',
          top: (($(window).height() / 2) - (37 / 2)),
          left: (($(window).width() / 2) - (37 / 2)),
          display: 'block',
          padding: '10px',
          zIndex: 1000002,
          position: 'fixed',
          background: '#111111',
          'background-image': 'url(data:image/gif;base64,R0lGODlhEAALAPQAA' +
          'BEREf///zIyMjs7OyMjI/j4+P///9PT04SEhKSkpFBQUN7e3ri4uH19faCgoExM' +
          'TNra2vr6+rW1tScnJzQ0NBoaGsnJyTAwMBwcHFRUVGhoaEFBQR8fHwAAAAAAAAA' +
          'AACH+GkNyZWF0ZWQgd2l0aCBhamF4bG9hZC5pbmZvACH5BAALAAAAIf8LTkVUU0' +
          'NBUEUyLjADAQAAACwAAAAAEAALAAAFLSAgjmRpnqSgCuLKAq5AEIM4zDVw03ve2' +
          '7ifDgfkEYe04kDIDC5zrtYKRa2WQgAh+QQACwABACwAAAAAEAALAAAFJGBhGAVg' +
          'nqhpHIeRvsDawqns0qeN5+y967tYLyicBYE7EYkYAgAh+QQACwACACwAAAAAEAA' +
          'LAAAFNiAgjothLOOIJAkiGgxjpGKiKMkbz7SN6zIawJcDwIK9W/HISxGBzdHTuB' +
          'NOmcJVCyoUlk7CEAAh+QQACwADACwAAAAAEAALAAAFNSAgjqQIRRFUAo3jNGIkS' +
          'dHqPI8Tz3V55zuaDacDyIQ+YrBH+hWPzJFzOQQaeavWi7oqnVIhACH5BAALAAQA' +
          'LAAAAAAQAAsAAAUyICCOZGme1rJY5kRRk7hI0mJSVUXJtF3iOl7tltsBZsNfUeg' +
          'jAY3I5sgFY55KqdX1GgIAIfkEAAsABQAsAAAAABAACwAABTcgII5kaZ4kcV2EqL' +
          'JipmnZhWGXaOOitm2aXQ4g7P2Ct2ER4AMul00kj5g0Al8tADY2y6C+4FIIACH5B' +
          'AALAAYALAAAAAAQAAsAAAUvICCOZGme5ERRk6iy7qpyHCVStA3gNa/7txxwlwv2' +
          'isSacYUc+l4tADQGQ1mvpBAAIfkEAAsABwAsAAAAABAACwAABS8gII5kaZ7kRFG' +
          'TqLLuqnIcJVK0DeA1r/u3HHCXC/aKxJpxhRz6Xi0ANAZDWa+kEAA7AAAAAAAAAA' +
          'AA)',
          'background-repeat': 'no-repeat',
          'background-position': 'center center'
        });

        $.fn.limp.loading.prependTo('body');
      };
  }

})(jQuery);
