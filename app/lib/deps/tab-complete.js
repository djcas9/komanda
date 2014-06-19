define([
  "jquery",
  "underscore"
], function($, __) {

  var calculator = {
    // key styles
    primaryStyles: ['fontFamily', 'fontSize', 'fontWeight', 'fontVariant', 'fontStyle',
      'paddingLeft', 'paddingTop', 'paddingBottom', 'paddingRight',
      'marginLeft', 'marginTop', 'marginBottom', 'marginRight',
      'borderLeftColor', 'borderTopColor', 'borderBottomColor', 'borderRightColor',
      'borderLeftStyle', 'borderTopStyle', 'borderBottomStyle', 'borderRightStyle',
      'borderLeftWidth', 'borderTopWidth', 'borderBottomWidth', 'borderRightWidth',
      'line-height', 'outline'],

      specificStyle: {
        'word-wrap': 'break-word',
        'overflow-x': 'hidden',
        'overflow-y': 'auto'
      },

      simulator : $('<div id="textarea_simulator"/>').css({
        position: 'absolute',
        top: 0,
        left: 0,
        visibility: 'hidden'
      }).appendTo(document.body),

      toHtml : function(text) {
        return text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>')
        .split(' ').join('<span style="white-space:prev-wrap">&nbsp;</span>');
      },
      // calculate position
      getCaretPosition: function() {
        var cal = calculator, self = this, element = self[0], elementOffset = self.offset();

        // IE has easy way to get caret offset position
        // if ($.browser.msie) {
        // // must get focus first
        // element.focus();
        // var range = document.selection.createRange();
        // $('#hskeywords').val(element.scrollTop);
        // return {
        // left: range.boundingLeft - elementOffset.left,
        // top: parseInt(range.boundingTop) - elementOffset.top + element.scrollTop
        // + document.documentElement.scrollTop + parseInt(self.getComputedStyle("fontSize"))
        // };
        // }
        cal.simulator.empty();
        // clone primary styles to imitate textarea
        $.each(cal.primaryStyles, function(index, styleName) {
          self.cloneStyle(cal.simulator, styleName);
        });

        // caculate width and height
        cal.simulator.css($.extend({
          'width': self.width(),
          'height': self.height()
        }, cal.specificStyle));

        var value = self.val(), cursorPosition = self.getCursorPosition();
        var beforeText = value.substring(0, cursorPosition),
        afterText = value.substring(cursorPosition);

        var before = $('<span class="before"/>').html(cal.toHtml(beforeText)),
        focus = $('<span class="focus"/>'),
        after = $('<span class="after"/>').html(cal.toHtml(afterText));

        cal.simulator.append(before).append(focus).append(after);
        var focusOffset = focus.offset(), simulatorOffset = cal.simulator.offset();
        // alert(focusOffset.left  + ',' +  simulatorOffset.left + ',' + element.scrollLeft);
        return {
          top: focusOffset.top - simulatorOffset.top - element.scrollTop
          // calculate and add the font height except Firefox
          + (parseInt(self.getComputedStyle("fontSize"))),
          left: focus[0].offsetLeft -  cal.simulator[0].offsetLeft - element.scrollLeft
        };
      }
  };

  $.fn.extend({
    getComputedStyle: function(styleName) {
      if (this.length == 0) return;
      var thiz = this[0];
      var result = this.css(styleName);
      result = result || ($.browser.msie ?
                          thiz.currentStyle[styleName]:
                          document.defaultView.getComputedStyle(thiz, null)[styleName]);
      return result;
    },
    // easy clone method
    cloneStyle: function(target, styleName) {
      var styleVal = this.getComputedStyle(styleName);
      if (!!styleVal) {
        $(target).css(styleName, styleVal);
      }
    },
    cloneAllStyle: function(target, style) {
      var thiz = this[0];
      for (var styleName in thiz.style) {
        var val = thiz.style[styleName];
        typeof val == 'string' || typeof val == 'number'
          ? this.cloneStyle(target, styleName)
          : NaN;
      }
    },
    getCursorPosition : function() {
      var thiz = this[0], result = 0;
      if ('selectionStart' in thiz) {
        result = thiz.selectionStart;
      } else if('selection' in document) {
        var range = document.selection.createRange();
        if (parseInt($.browser.version) > 6) {
          thiz.focus();
          var length = document.selection.createRange().text.length;
          range.moveStart('character', - thiz.value.length);
          result = range.text.length - length;
        } else {
          var bodyRange = document.body.createTextRange();
          bodyRange.moveToElementText(thiz);
          for (; bodyRange.compareEndPoints("StartToStart", range) < 0; result++)
          bodyRange.moveStart('character', 1);
          for (var i = 0; i <= result; i ++){
            if (thiz.value.charAt(i) == '\n')
              result++;
          }
          var enterCount = thiz.value.split('\n').length - 1;
          result -= enterCount;
          return result;
        }
      }
      return result;
    },
    getCaretPosition: calculator.getCaretPosition
  });

  $.caretTo = function (el, index) {
    if (el.createTextRange) { 
      var range = el.createTextRange(); 
      range.move("character", index); 
      range.select(); 
    } else if (el.selectionStart != null) { 
      el.focus(); 
      el.setSelectionRange(index, index); 
    }
  };

  // Another behind the scenes that collects the
  // current caret position for an element

  // TODO: Get working with Opera
  $.caretPos = function (el) {
    if ("selection" in document) {
      var range = el.createTextRange();
      try {
        range.setEndPoint("EndToStart", document.selection.createRange());
      } catch (e) {
        // Catch IE failure here, return 0 like
        // other browsers
        return 0;
      }
      return range.text.length;
    } else if (el.selectionStart != null) {
      return el.selectionStart;
    }
  };

  // The following methods are queued under fx for more
  // flexibility when combining with $.fn.delay() and
  // jQuery effects.

  // Set caret to a particular index
  $.fn.caret = function (index, offset) {
    if (typeof(index) === "undefined") {
      return $.caretPos(this.get(0));
    }

    return this.queue(function (next) {
      if (isNaN(index)) {
        var i = $(this).val().indexOf(index);

        if (offset === true) {
          i += index.length;
        } else if (typeof(offset) !== "undefined") {
          i += offset;
        }

        $.caretTo(this, i);
      } else {
        $.caretTo(this, index);
      }

      next();
    });
  };

  // Set caret to beginning of an element
  $.fn.caretToStart = function () {
    return this.caret(0);
  };

  // Set caret to the end of an element
  $.fn.caretToEnd = function () {
    return this.queue(function (next) {
      $.caretTo(this, $(this).val().length);
      next();
    });
  };

  function Trie (prefix) {
    // Prefix records our position in the larger trie datastructure
    this.prefix = __.isUndefined(prefix) ? '' : prefix;

    // Keys are the first characters of the children and values
    // are the sub-Tries
    this.children = {}

    // If a word has been added that ends at this trie, is true.
    this.isEnd = false;
  }

  /*
   * Add a list of words to the trie.
   */
  Trie.prototype.words = function (words) {
    this.children = {};

    __.each(words, function (w) { this.word(w); }, this);
    return this;
  }

  /*
   * Add a single word to the trie.
   */
  Trie.prototype.word = function (word) {

    var c = word.charAt(0);
    if (!(c in this.children)) {
      this.children[c.toLowerCase()] = new Trie(this.prefix + c);
    }
    if (word.length > 1) {
      this.children[c.toLowerCase()].word(word.substring(1));
    } else {
      this.children[c.toLowerCase()].isEnd = true;
    }
    return this;
  };

  /*
   * Starting from the current node, navigate to the node reachable,
   * if any, with the given prefix.
   */
  Trie.prototype.find = function (prefix) {
    if (!prefix) return this;

    if (prefix.length == 0) {
      return this;
    } else {
      var c = prefix[0];
      if (c in this.children) {
        return this.children[c].find(prefix.substring(1));
      } else {
        return null;
      }
    }
  }

  /*
   * Starting from the current node, find the longest unique prefix.
   */
  Trie.prototype.uniquePrefix = function () {

    var nextCharacters = __.keys(this.children);

    if (this.isEnd || nextCharacters.length > 1) {
      // If this is the end, either we have children with differ
      // from us but who share our prefix or we do not in which
      // case this is the end of the line and our prefix is as
      // long as it gets.
      return this.prefix;

    } else if (nextCharacters.length === 1) {
      // If are not the end and we have only one child, we can
      // extend the prefix.
      return this.children[nextCharacters[0]].uniquePrefix();

    } else {
      // Special case that can only happen in an empty root node.
      return '';
    }
  }


  /*
   * Starting from the current node get a list of all the complete words beneath it.
   */
  Trie.prototype.choices = function () {
    var result = [];
    function walk (trie) {
      // This node may itself represent a full word.
      if (trie.isEnd) result.push(trie.prefix);

      // And it may have chidlern representing longer words.
      __.each(trie.children, function (child, c) {
        walk(child);
      });
    }

    walk(this);
    return result;
  }

  function moveCursorToEnd(el) {
    if (typeof el.selectionStart == "number") {
      el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != "undefined") {
      el.focus();
      var range = el.createTextRange();
      range.collapse(false);
      range.select();
    }
  };

  var setupTabCompletion = function (input, suggestions, usevalue) {
    var root = new Trie();
    var cache = false;
    var index = 0;

    var items = [];
    var value = "";

    input.keydown(function (e) {

      if (e.which === 9) {
        // var pos = input.getCaretPosition();

        if (!cache) {
          items = e.target.value.split(' ');
          value = items[(items.length - 1)];

          if (items.length > 1) {
            items.pop();
          }

          cache = true;
        }

        if(!__.isUndefined(value)) {
          value = value.toLowerCase();
        }

        var trie = root.find(value);

        if (trie) {
          // items[(items.length - 1)] = trie.uniquePrefix();

          var choices = trie.choices();

          if (choices.length > 1) {

            if (index >= choices.length) index = 0;

            if (items.length === 1 && items[0].toLowerCase() === value) {
              var v = choices[index];

              if (v.match(/\//) || v.match(/\#/)) {
                e.target.value = v + " ";
              } else {
                e.target.value = v + ": ";
              };
              index++;
            } else {
              e.target.value = items.join(" ") + " " + choices[index] + " ";
              index++;
            }

          } else {
            if (items.length === 1 && items[0].toLowerCase() === value) {
              var v = choices[index];
              if (v.match(/\//) || v.match(/\#/)) {
                e.target.value = v + " ";
              } else {
                e.target.value = v + ": ";
              };
              cache = false;
              index = 0
            } else {
              e.target.value = items.join(" ") + " " + choices[index] + " ";
              cache = false;
              index = 0
            }
          };
        } else {
          cache = false;
          index = 0
        }
        e.preventDefault();

      } else if (e.which === 40) {
        // down
        //
        Komanda.historyIndex--;

        if (Komanda.historyIndex < 0) {
          e.target.value = "";
          Komanda.historyIndex = -1;
        }

        var historyDown = Komanda.history.get(Komanda.historyIndex);

        if (historyDown) {
          e.target.value = historyDown;

          setTimeout(function() {
            moveCursorToEnd(e.target);
          }, 10);

        }

      } else if (e.which === 38) {
        // up
        if (Komanda.historyIndex < 0) {
          Komanda.historyIndex = 0;
        };

        var historyUp = Komanda.history.get(Komanda.historyIndex);

        if (historyUp) {
          e.target.value = historyUp;

          setTimeout(function() {
            moveCursorToEnd(e.target);
          }, 10);

          var max = Komanda.history.list.length - 1;
          if (Komanda.historyIndex >= max) {
            Komanda.historyIndex = max;
          } else {
            Komanda.historyIndex++;
          }
        }

      } else if (e.which === 13) {
        // do nothing
        cache = false;
        index = 0;
      } else {
        cache = false;
        index = 0;
      };
    }).blur(function (e) {
      cache = false;
      index = 0;

      if (usevalue && (typeof usevalue === "function")) {
        usevalue(e.target.value);
      };
    });

    return {
      words: function (words) { root.words(words); },
      word: function (word) { root.word(word); },
    }
  }

  // $(document).ready(function () {

  // var words = ['abcfoo', 'abcfoobar', 'abcbar', 'abcfood', 'abcbaz', 'abcbarth', 'abcquux', 'abc'];
  // var completer = setupTabCompletion($('#to__.omplete'), $('#suggestions'), function (v) {
  // $('#log').append($('<p>').text('value: ' + v));
  // })
  // completer.words(words);

  // });

  return setupTabCompletion;
});


