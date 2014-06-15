define([
  "jquery",
  "underscore",
  "caret"
], function($, __) {

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
      this.children[c] = new Trie(this.prefix + c);
    }
    if (word.length > 1) {
      this.children[c].word(word.substring(1));
    } else {
      this.children[c].isEnd = true;
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

        var trie = root.find(value);

        if (trie) {
          // items[(items.length - 1)] = trie.uniquePrefix();
          var choices = trie.choices();

          if (choices.length > 1) {

            if (index >= choices.length) index = 0;

            if (items.length === 1 && items[0] === value) {
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
            if (items.length === 1 && items[0] === value) {
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
        var value = Komanda.history.get(Komanda.historyIndex);

        if (value) {
          e.target.value = value;

          if (Komanda.historyIndex <= 0) {
            Komanda.historyIndex = 0;
          } else {
            Komanda.historyIndex--;
          }
        }

      } else if (e.which === 38) { 
        // up
        var value = Komanda.history.get(Komanda.historyIndex);

        if (value) {
          e.target.value = value;
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


