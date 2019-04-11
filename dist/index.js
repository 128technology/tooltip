/*!
 * tooltip 0.1.0 - 25th Jul 2016
 * https://github.com/darsain/tooltip
 *
 * Licensed under the MIT license.
 * http://opensource.org/licenses/MIT
 */

(function() {
  /**
   * Require the module at `name`.
   *
   * @param {String} name
   * @return {Object} exports
   * @api public
   */

  function require(name) {
    var module = require.modules[name];
    if (!module) throw new Error('failed to require "' + name + '"');

    if (!('exports' in module) && typeof module.definition === 'function') {
      module.client = module.component = true;
      module.definition.call(this, (module.exports = {}), module);
      delete module.definition;
    }

    return module.exports;
  }

  /**
   * Meta info, accessible in the global scope unless you use AMD option.
   */

  require.loader = 'component';

  /**
   * Internal helper object, contains a sorting function for semantiv versioning
   */
  require.helper = {};
  require.helper.semVerSort = function(a, b) {
    var aArray = a.version.split('.');
    var bArray = b.version.split('.');
    for (var i = 0; i < aArray.length; ++i) {
      var aInt = parseInt(aArray[i], 10);
      var bInt = parseInt(bArray[i], 10);
      if (aInt === bInt) {
        var aLex = aArray[i].substr(('' + aInt).length);
        var bLex = bArray[i].substr(('' + bInt).length);
        if (aLex === '' && bLex !== '') return 1;
        if (aLex !== '' && bLex === '') return -1;
        if (aLex !== '' && bLex !== '') return aLex > bLex ? 1 : -1;
        continue;
      } else if (aInt > bInt) {
        return 1;
      } else {
        return -1;
      }
    }
    return 0;
  };

  /**
     * Find and require a module which name starts with the provided name.
     * If multiple modules exists, the highest semver is used. 
     * This function can only be used for remote dependencies.
    
     * @param {String} name - module name: `user~repo`
     * @param {Boolean} returnPath - returns the canonical require path if true, 
     *                               otherwise it returns the epxorted module
     */
  require.latest = function(name, returnPath) {
    function showError(name) {
      throw new Error('failed to find latest module of "' + name + '"');
    }
    // only remotes with semvers, ignore local files conataining a '/'
    var versionRegexp = /(.*)~(.*)@v?(\d+\.\d+\.\d+[^\/]*)$/;
    var remoteRegexp = /(.*)~(.*)/;
    if (!remoteRegexp.test(name)) showError(name);
    var moduleNames = Object.keys(require.modules);
    var semVerCandidates = [];
    var otherCandidates = []; // for instance: name of the git branch
    for (var i = 0; i < moduleNames.length; i++) {
      var moduleName = moduleNames[i];
      if (new RegExp(name + '@').test(moduleName)) {
        var version = moduleName.substr(name.length + 1);
        var semVerMatch = versionRegexp.exec(moduleName);
        if (semVerMatch != null) {
          semVerCandidates.push({ version: version, name: moduleName });
        } else {
          otherCandidates.push({ version: version, name: moduleName });
        }
      }
    }
    if (semVerCandidates.concat(otherCandidates).length === 0) {
      showError(name);
    }
    if (semVerCandidates.length > 0) {
      var module = semVerCandidates.sort(require.helper.semVerSort).pop().name;
      if (returnPath === true) {
        return module;
      }
      return require(module);
    }
    // if the build contains more than one branch of the same module
    // you should not use this funciton
    var module = otherCandidates.sort(function(a, b) {
      return a.name > b.name;
    })[0].name;
    if (returnPath === true) {
      return module;
    }
    return require(module);
  };

  /**
   * Registered modules.
   */

  require.modules = {};

  /**
   * Register module at `name` with callback `definition`.
   *
   * @param {String} name
   * @param {Function} definition
   * @api private
   */

  require.register = function(name, definition) {
    require.modules[name] = {
      definition: definition
    };
  };

  /**
   * Define a module's exports immediately with `exports`.
   *
   * @param {String} name
   * @param {Generic} exports
   * @api private
   */

  require.define = function(name, exports) {
    require.modules[name] = {
      exports: exports
    };
  };
  require.register('darsain~constructor-apply@0.1.0', function(exports, module) {
    module.exports = constructorApply;

    /**
     * Apply arguments to constructor.
     *
     * @param  {Function} Constructor
     * @param  {Array}    args
     * @return {Object}
     */
    function apply(Constructor, args) {
      return Constructor.apply(this, args);
    }

    /**
     * Apply arguments to constructor, ensuring the
     * constructor si called with a `new` keyword.
     *
     * @param  {Function} Constructor
     * @param  {Array}    args
     * @return {Object}
     */
    function constructorApply(Constructor, args) {
      apply.prototype = Constructor.prototype;
      return new apply(Constructor, args);
    }
  });

  require.register('component~indexof@0.0.3', function(exports, module) {
    module.exports = function(arr, obj) {
      if (arr.indexOf) return arr.indexOf(obj);
      for (var i = 0; i < arr.length; ++i) {
        if (arr[i] === obj) return i;
      }
      return -1;
    };
  });

  require.register('darsain~fuse@1.0.0', function(exports, module) {
    var constructorApply = require('darsain~constructor-apply@0.1.0');
    var indexof = require('component~indexof@0.0.3');
    var slice = [].slice;

    module.exports = Fuse;

    /**
     * Fuses multiple objects into one to allow calling methods on all of them simultaneously.
     *
     * @param {Object} objN
     * @return {Fuse}
     */
    function Fuse() {
      if (!(this instanceof Fuse)) return constructorApply(Fuse, arguments);
      this.objs = [];
      for (var i = 0, l = arguments.length; i < l; i++) this.add(arguments[i]);
    }

    var proto = Fuse.prototype;

    proto.add = function(obj) {
      if (!~indexof(this.objs, obj)) this.objs.push(obj);
    };

    proto.remove = function(obj) {
      var index = indexof(this.objs, obj);
      if (~index) this.objs.splice(index, 1);
    };

    proto.has = function(obj) {
      return !!~indexof(this.objs, obj);
    };

    proto.call = function(method) {
      this.apply(method, slice.call(arguments, 1));
    };

    proto.apply = function(method, args) {
      for (var i = 0, l = this.objs.length; i < l; i++) this.objs[i][method].apply(this.objs[i], args);
    };
  });

  require.register('component~raf@1.2.0', function(exports, module) {
    /**
     * Expose `requestAnimationFrame()`.
     */

    exports = module.exports =
      window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || fallback;

    /**
     * Fallback implementation.
     */

    var prev = new Date().getTime();
    function fallback(fn) {
      var curr = new Date().getTime();
      var ms = Math.max(0, 16 - (curr - prev));
      var req = setTimeout(fn, ms);
      prev = curr;
      return req;
    }

    /**
     * Cancel.
     */

    var cancel =
      window.cancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.clearTimeout;

    exports.cancel = function(id) {
      cancel.call(window, id);
    };
  });

  require.register('darsain~raft@1.0.0', function(exports, module) {
    var raf = require('component~raf@1.2.0');

    module.exports = function raft(fn) {
      var id, ctx, args;

      function call() {
        id = 0;
        fn.apply(ctx, args);
      }

      return function() {
        ctx = this;
        args = arguments;
        if (!id) id = raf(call);
      };
    };
  });

  require.register('darsain~event@1.0.0', function(exports, module) {
    /**
     * Bind `el` event `type` to `fn`.
     *
     * @param {Element}  el
     * @param {String}   type
     * @param {Function} fn
     * @param {Boolean}  [capture]
     *
     * @return {Function} `fn`
     */
    exports.bind = window.addEventListener
      ? function(el, type, fn, capture) {
          el.addEventListener(type, fn, capture || false);
          return fn;
        }
      : function(el, type, fn) {
          var fnid = type + fn;

          el[fnid] =
            el[fnid] ||
            function() {
              var event = window.event;
              event.target = event.srcElement;
              event.preventDefault = preventDefault;
              event.stopPropagation = stopPropagation;
              fn.call(el, event);
            };

          el.attachEvent('on' + type, el[fnid]);
          return fn;
        };

    /**
     * Unbind `el` event `type`'s callback `fn`.
     *
     * @param {Element}  el
     * @param {String}   type
     * @param {Function} fn
     * @param {Boolean}  [capture]
     *
     * @return {Function} `fn`
     */
    exports.unbind = window.removeEventListener
      ? function(el, type, fn, capture) {
          el.removeEventListener(type, fn, capture || false);
          return fn;
        }
      : function(el, type, fn) {
          var fnid = type + fn;
          el.detachEvent('on' + type, el[fnid]);

          // clean up reference to handler function, but with a fallback
          // because we can't delete window object properties
          try {
            delete el[fnid];
          } catch (err) {
            el[fnid] = undefined;
          }

          return fn;
        };

    /**
     * Prevets default event action in IE8-.
     */
    function preventDefault() {
      this.returnValue = false;
    }

    /**
     * Stops event propagation in IE8-.
     */
    function stopPropagation() {
      this.cancelBubble = true;
    }
  });

  require.register('component~type@v1.2.1', function(exports, module) {
    /**
     * toString ref.
     */

    var toString = Object.prototype.toString;

    /**
     * Return the type of `val`.
     *
     * @param {Mixed} val
     * @return {String}
     * @api public
     */

    module.exports = function(val) {
      switch (toString.call(val)) {
        case '[object Date]':
          return 'date';
        case '[object RegExp]':
          return 'regexp';
        case '[object Arguments]':
          return 'arguments';
        case '[object Array]':
          return 'array';
        case '[object Error]':
          return 'error';
      }

      if (val === null) return 'null';
      if (val === undefined) return 'undefined';
      if (val !== val) return 'nan';
      if (val && val.nodeType === 1) return 'element';

      if (isBuffer(val)) return 'buffer';

      val = val.valueOf ? val.valueOf() : Object.prototype.valueOf.apply(val);

      return typeof val;
    };

    // code borrowed from https://github.com/feross/is-buffer/blob/master/index.js
    function isBuffer(obj) {
      return !!(
        obj != null &&
        (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
          (obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)))
      );
    }
  });

  require.register('component~clone@0.2.3', function(exports, module) {
    /**
     * Module dependencies.
     */

    var type;
    try {
      type = require('component~type@v1.2.1');
    } catch (_) {
      type = require('component~type@v1.2.1');
    }

    /**
     * Module exports.
     */

    module.exports = clone;

    /**
     * Clones objects.
     *
     * @param {Mixed} any object
     * @api public
     */

    function clone(obj) {
      switch (type(obj)) {
        case 'object':
          var copy = {};
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              copy[key] = clone(obj[key]);
            }
          }
          return copy;

        case 'array':
          var copy = new Array(obj.length);
          for (var i = 0, l = obj.length; i < l; i++) {
            copy[i] = clone(obj[i]);
          }
          return copy;

        case 'regexp':
          // from millermedeiros/amd-utils - MIT
          var flags = '';
          flags += obj.multiline ? 'm' : '';
          flags += obj.global ? 'g' : '';
          flags += obj.ignoreCase ? 'i' : '';
          return new RegExp(obj.source, flags);

        case 'date':
          return new Date(obj.getTime());

        default:
          // string, number, boolean, …
          return obj;
      }
    }
  });

  require.register('darsain~extend@1.0.0', function(exports, module) {
    var type = require('component~type@v1.2.1');
    var clone = require('component~clone@0.2.3');
    var slice = [].slice;

    module.exports = exports = extend;

    function extend(root) {
      var args = slice.call(arguments, 1);
      var deep = false;
      if (typeof root === 'boolean') {
        deep = root;
        root = args.shift();
      }
      for (var i = 0, l = args.length, source; (source = args[i]), i < l; i++) {
        if (!source) continue;
        for (var prop in source) {
          if (!deep || !source[prop]) root[prop] = source[prop];
          else if (type(root[prop]) === 'object' && type(source[prop]) === 'object')
            root[prop] = extend(true, root[prop], clone(source[prop]));
          else root[prop] = clone(source[prop]);
        }
      }
      return root;
    }
  });

  require.register('darsain~iswindow@1.0.0', function(exports, module) {
    module.exports = isWindow;

    /**
     * Check whether value is a window object.
     *
     * Uses duck typing to determine window. Without IE8 all we need is:
     *
     *   var type = Object.prototype.toString.call(val);
     *   return type === '[object global]' || type === '[object Window]' || type === '[object DOMWindow]';
     *
     * @param  {Mixed} val
     * @return {Boolean}
     */
    function isWindow(val) {
      /* jshint eqeqeq:false */
      var doc, docWin;
      return !!(
        val &&
        typeof val === 'object' &&
        typeof val.window === 'object' &&
        val.window == val &&
        val.setTimeout &&
        val.alert &&
        (doc = val.document) &&
        typeof doc === 'object' &&
        (docWin = doc.defaultView || doc.parentWindow) &&
        typeof docWin === 'object' &&
        docWin == val
      );
    }
  });

  require.register('darsain~position@1.0.0', function(exports, module) {
    var isWindow = require('darsain~iswindow@1.0.0');

    module.exports = position;

    /**
     * Poor man's shallow object extend;
     *
     * @param  {Object} a
     * @param  {Object} b
     * @return {Object}
     */
    function extend(a, b) {
      for (var k in b) a[k] = b[k];
      return a;
    }

    /**
     * Returns element's position object with `left`, `top`, `bottom`, `right`,
     * `width`, and `height` properties indicating the position and dimensions
     * of element on a page, or relative to other element.
     *
     * @param {Element} element
     * @param {Element} [relativeTo] Defaults to `document.documentElement`.
     *
     * @return {Object|null}
     */
    function position(element, relativeTo) {
      var isWin = isWindow(element);
      var doc = isWin ? element.document : element.ownerDocument || element;
      var docEl = doc.documentElement;
      var win = isWindow(relativeTo) ? relativeTo : doc.defaultView || window;

      // normalize arguments
      if (element === doc) element = docEl;
      relativeTo = !relativeTo || relativeTo === doc ? docEl : relativeTo;

      var winTop = (win.pageYOffset || docEl.scrollTop) - docEl.clientTop;
      var winLeft = (win.pageXOffset || docEl.scrollLeft) - docEl.clientLeft;
      var box = { top: 0, left: 0 };

      if (isWin) {
        box.width = box.right = win.innerWidth || docEl.clientWidth;
        box.height = box.bottom = win.innerHeight || docEl.clientHeight;
      } else if (element === docEl) {
        // we need to do  this manually because docEl.getBoundingClientRect
        // is inconsistent in <IE11
        box.top = -winTop;
        box.left = -winLeft;
        box.width = Math.max(docEl.clientWidth, docEl.scrollWidth);
        box.height = Math.max(docEl.clientHeight, docEl.scrollHeight);
        box.right = box.width - winLeft;
        box.bottom = box.height - winTop;
      } else if (docEl.contains(element) && element.getBoundingClientRect) {
        // new object needed because DOMRect properties are read-only
        box = extend({}, element.getBoundingClientRect());
        // width & height don't exist in <IE9
        box.width = box.right - box.left;
        box.height = box.bottom - box.top;
      } else {
        return null;
      }

      // current box is already relative to window
      if (relativeTo === win) return box;

      // add window offsets, making the box relative to documentElement
      box.top += winTop;
      box.left += winLeft;
      box.right += winLeft;
      box.bottom += winTop;

      // current box is already relative to documentElement
      if (relativeTo === docEl) return box;

      // subtract position of other element
      var relBox = position(relativeTo);
      box.left -= relBox.left;
      box.right -= relBox.left;
      box.top -= relBox.top;
      box.bottom -= relBox.top;

      return box;
    }
  });

  require.register('darsain~parse-number@1.0.0', function(exports, module) {
    /**
     * Parse the first number from a string.
     *
     * @param {Str} str
     *
     * @return {Integer}
     */
    module.exports = function parseNumber(str) {
      var match = String(str).match(/-?\d+(?:\.\d+)?/);
      return match ? match[0] / 1 : 0;
    };
  });

  require.register('component~classes@1.2.6', function(exports, module) {
    /**
     * Module dependencies.
     */

    try {
      var index = require('component~indexof@0.0.3');
    } catch (err) {
      var index = require('component~indexof@0.0.3');
    }

    /**
     * Whitespace regexp.
     */

    var re = /\s+/;

    /**
     * toString reference.
     */

    var toString = Object.prototype.toString;

    /**
     * Wrap `el` in a `ClassList`.
     *
     * @param {Element} el
     * @return {ClassList}
     * @api public
     */

    module.exports = function(el) {
      return new ClassList(el);
    };

    /**
     * Initialize a new ClassList for `el`.
     *
     * @param {Element} el
     * @api private
     */

    function ClassList(el) {
      if (!el || !el.nodeType) {
        throw new Error('A DOM element reference is required');
      }
      this.el = el;
      this.list = el.classList;
    }

    /**
     * Add class `name` if not already present.
     *
     * @param {String} name
     * @return {ClassList}
     * @api public
     */

    ClassList.prototype.add = function(name) {
      // classList
      if (this.list) {
        this.list.add(name);
        return this;
      }

      // fallback
      var arr = this.array();
      var i = index(arr, name);
      if (!~i) arr.push(name);
      this.el.className = arr.join(' ');
      return this;
    };

    /**
     * Remove class `name` when present, or
     * pass a regular expression to remove
     * any which match.
     *
     * @param {String|RegExp} name
     * @return {ClassList}
     * @api public
     */

    ClassList.prototype.remove = function(name) {
      if ('[object RegExp]' == toString.call(name)) {
        return this.removeMatching(name);
      }

      // classList
      if (this.list) {
        this.list.remove(name);
        return this;
      }

      // fallback
      var arr = this.array();
      var i = index(arr, name);
      if (~i) arr.splice(i, 1);
      this.el.className = arr.join(' ');
      return this;
    };

    /**
     * Remove all classes matching `re`.
     *
     * @param {RegExp} re
     * @return {ClassList}
     * @api private
     */

    ClassList.prototype.removeMatching = function(re) {
      var arr = this.array();
      for (var i = 0; i < arr.length; i++) {
        if (re.test(arr[i])) {
          this.remove(arr[i]);
        }
      }
      return this;
    };

    /**
     * Toggle class `name`, can force state via `force`.
     *
     * For browsers that support classList, but do not support `force` yet,
     * the mistake will be detected and corrected.
     *
     * @param {String} name
     * @param {Boolean} force
     * @return {ClassList}
     * @api public
     */

    ClassList.prototype.toggle = function(name, force) {
      // classList
      if (this.list) {
        if ('undefined' !== typeof force) {
          if (force !== this.list.toggle(name, force)) {
            this.list.toggle(name); // toggle again to correct
          }
        } else {
          this.list.toggle(name);
        }
        return this;
      }

      // fallback
      if ('undefined' !== typeof force) {
        if (!force) {
          this.remove(name);
        } else {
          this.add(name);
        }
      } else {
        if (this.has(name)) {
          this.remove(name);
        } else {
          this.add(name);
        }
      }

      return this;
    };

    /**
     * Return an array of classes.
     *
     * @return {Array}
     * @api public
     */

    ClassList.prototype.array = function() {
      var className = this.el.getAttribute('class') || '';
      var str = className.replace(/^\s+|\s+$/g, '');
      var arr = str.split(re);
      if ('' === arr[0]) arr.shift();
      return arr;
    };

    /**
     * Check if class `name` is present.
     *
     * @param {String} name
     * @return {ClassList}
     * @api public
     */

    ClassList.prototype.has = ClassList.prototype.contains = function(name) {
      return this.list ? this.list.contains(name) : !!~index(this.array(), name);
    };
  });

  require.register('jkroso~computed-style@0.1.0', function(exports, module) {
    /**
     * Get the computed style of a DOM element
     *
     *   style(document.body) // => {width:'500px', ...}
     *
     * @param {Element} element
     * @return {Object}
     */

    // Accessing via window for jsDOM support
    module.exports = window.getComputedStyle;

    // Fallback to elem.currentStyle for IE < 9
    if (!module.exports) {
      module.exports = function(elem) {
        return elem.currentStyle;
      };
    }
  });

  require.register('tooltip', function(exports, module) {
    var style = require('jkroso~computed-style@0.1.0');
    var evt = require('darsain~event@1.0.0');
    var extend = require('darsain~extend@1.0.0');
    var classes = require('component~classes@1.2.6');
    var indexOf = require('component~indexof@0.0.3');
    var position = require('darsain~position@1.0.0');
    var parseNumber = require('darsain~parse-number@1.0.0');
    var transitionDuration = require('tooltip/lib/tduration.js');

    var win = window;
    var doc = win.document;
    var body = doc.body;
    var verticalPlaces = ['top', 'bottom'];

    module.exports = Tooltip;

    /**
     * Tooltip construnctor.
     *
     * @param {String|Element} [content]
     * @param {Object}         [options]
     *
     * @return {Tooltip}
     */
    function Tooltip(content, options) {
      if (!(this instanceof Tooltip)) return new Tooltip(content, options);
      if (typeof content === 'object' && content.nodeType == null) {
        options = content;
        content = null;
      }
      this.hidden = true;
      this.options = extend(true, {}, Tooltip.defaults, options);
      this._createElement();
      if (content) this.content(content);
    }

    /**
     * Creates a Tooltip element.
     *
     * @return {Void}
     */
    Tooltip.prototype._createElement = function() {
      this.element = doc.createElement('div');
      this.classes = classes(this.element);
      this.classes.add(this.options.baseClass);
      this.element.style.pointerEvents = this.options.interactive ? 'auto' : 'none';
      var propName;
      for (var i = 0; i < Tooltip.classTypes.length; i++) {
        propName = Tooltip.classTypes[i] + 'Class';
        if (this.options[propName]) this.classes.add(this.options[propName]);
      }
    };

    /**
     * Changes Tooltip's type class type.
     *
     * @param {String} name
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.type = function(name) {
      return this.changeClassType('type', name);
    };

    /**
     * Changes Tooltip's effect class type.
     *
     * @param {String} name
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.effect = function(name) {
      return this.changeClassType('effect', name);
    };

    /**
     * Changes class type.
     *
     * @param {String} propName
     * @param {String} newClass
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.changeClassType = function(propName, newClass) {
      propName += 'Class';
      if (this.options[propName]) this.classes.remove(this.options[propName]);
      this.options[propName] = newClass;
      if (newClass) this.classes.add(newClass);
      return this;
    };

    /**
     * Updates Tooltip's dimensions.
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.updateSize = function() {
      if (this.hidden) {
        this.element.style.visibility = 'hidden';
        body.appendChild(this.element);
      }
      this.width = this.element.offsetWidth;
      this.height = this.element.offsetHeight;
      if (this.spacing == null)
        this.spacing = this.options.spacing != null ? this.options.spacing : parseNumber(style(this.element).top);
      if (this.hidden) {
        body.removeChild(this.element);
        this.element.style.visibility = '';
      } else {
        this.position();
      }
      return this;
    };

    /**
     * Change Tooltip content.
     *
     * When Tooltip is visible, its size is automatically
     * synced and Tooltip correctly repositioned.
     *
     * @param {String|Element} content
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.content = function(content) {
      if (typeof content === 'object') {
        this.element.innerHTML = '';
        this.element.appendChild(content);
      } else {
        this.element.innerHTML = content;
      }
      this.updateSize();
      return this;
    };

    /**
     * Pick new place Tooltip should be displayed at.
     *
     * When the Tooltip is visible, it is automatically positioned there.
     *
     * @param {String} place
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.place = function(place) {
      this.options.place = place;
      if (!this.hidden) this.position();
      return this;
    };

    /**
     * Attach Tooltip to an element.
     *
     * @param {Element} element
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.attach = function(element) {
      this.attachedTo = element;
      if (!this.hidden) this.position();
      return this;
    };

    /**
     * Detach Tooltip from element.
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.detach = function() {
      this.hide();
      delete this.attachedTo;
      return this;
    };

    /**
     * Pick the most reasonable place for target position.
     *
     * @param {Object} target
     *
     * @return {Tooltip}
     */
    Tooltip.prototype._pickPlace = function(target) {
      if (!this.options.auto) return this.options.place;
      var winPos = position(win);
      var place = this.options.place.split('-');
      var spacing = this.spacing;

      if (~indexOf(verticalPlaces, place[0])) {
        if (target.top - this.height - spacing <= winPos.top) place[0] = 'bottom';
        else if (target.bottom + this.height + spacing >= winPos.bottom) place[0] = 'top';
        switch (place[1]) {
          case 'left':
            if (target.right - this.width <= winPos.left) place[1] = 'right';
            break;
          case 'right':
            if (target.left + this.width >= winPos.right) place[1] = 'left';
            break;
          default:
            if (target.left + target.width / 2 + this.width / 2 >= winPos.right) place[1] = 'left';
            else if (target.right - target.width / 2 - this.width / 2 <= winPos.left) place[1] = 'right';
        }
      } else {
        if (target.left - this.width - spacing <= winPos.left) place[0] = 'right';
        else if (target.right + this.width + spacing >= winPos.right) place[0] = 'left';
        switch (place[1]) {
          case 'top':
            if (target.bottom - this.height <= winPos.top) place[1] = 'bottom';
            break;
          case 'bottom':
            if (target.top + this.height >= winPos.bottom) place[1] = 'top';
            break;
          default:
            if (target.top + target.height / 2 + this.height / 2 >= winPos.bottom) place[1] = 'top';
            else if (target.bottom - target.height / 2 - this.height / 2 <= winPos.top) place[1] = 'bottom';
        }
      }

      return place.join('-');
    };

    /**
     * Position the Tooltip to an element or a specific coordinates.
     *
     * @param {Integer|Element} x
     * @param {Integer}         y
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.position = function(x, y) {
      x = this.attachedTo || x;
      if (x == null && this._p) {
        x = this._p[0];
        y = this._p[1];
      } else {
        this._p = arguments;
      }
      var target =
        typeof x === 'number'
          ? {
              left: 0 | x,
              right: 0 | x,
              top: 0 | y,
              bottom: 0 | y,
              width: 0,
              height: 0
            }
          : position(x);
      var spacing = this.spacing;
      var newPlace = this._pickPlace(target);

      // Add/Change place class when necessary
      if (newPlace !== this.curPlace) {
        if (this.curPlace) this.classes.remove(this.curPlace);
        this.classes.add(newPlace);
        this.curPlace = newPlace;
      }

      // Position the tip
      var top, left;
      switch (this.curPlace) {
        case 'top':
          top = target.top - this.height - spacing;
          left = target.left + target.width / 2 - this.width / 2;
          break;
        case 'top-left':
          top = target.top - this.height - spacing;
          left = target.right - this.width;
          break;
        case 'top-right':
          top = target.top - this.height - spacing;
          left = target.left;
          break;

        case 'bottom':
          top = target.bottom + spacing;
          left = target.left + target.width / 2 - this.width / 2;
          break;
        case 'bottom-left':
          top = target.bottom + spacing;
          left = target.right - this.width;
          break;
        case 'bottom-right':
          top = target.bottom + spacing;
          left = target.left;
          break;

        case 'left':
          top = target.top + target.height / 2 - this.height / 2;
          left = target.left - this.width - spacing;
          break;
        case 'left-top':
          top = target.bottom - this.height;
          left = target.left - this.width - spacing;
          break;
        case 'left-bottom':
          top = target.top;
          left = target.left - this.width - spacing;
          break;

        case 'right':
          top = target.top + target.height / 2 - this.height / 2;
          left = target.right + spacing;
          break;
        case 'right-top':
          top = target.bottom - this.height;
          left = target.right + spacing;
          break;
        case 'right-bottom':
          top = target.top;
          left = target.right + spacing;
          break;
      }

      // Set tip position & class
      this.element.style.top = Math.round(top) + 'px';
      this.element.style.left = Math.round(left) + 'px';

      return this;
    };

    /**
     * Show the Tooltip.
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.show = function() {
      // Clear potential ongoing animation
      clearTimeout(this.aIndex);

      // Position the element when needed
      if (this.attachedTo) this.position(this.attachedTo);

      // Stop here if tip is already visible
      if (this.hidden) {
        this.hidden = false;
        body.appendChild(this.element);
      }

      // Make Tooltip aware of window resize
      if (this.attachedTo) this._aware();

      // Trigger layout and kick in the transition
      if (this.options.inClass) {
        if (this.options.effectClass) void this.element.clientHeight;
        this.classes.add(this.options.inClass);
      }

      return this;
    };

    /**
     * Hide the Tooltip.
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.hide = function() {
      if (this.hidden) return;

      var self = this;
      var duration = 0;

      // Remove .in class and calculate transition duration if any
      if (this.options.inClass) {
        this.classes.remove(this.options.inClass);
        if (this.options.effectClass) duration = transitionDuration(this.element);
      }

      // Remove tip from window resize awareness
      if (this.attachedTo) this._unaware();

      // Remove the tip from the DOM when transition is done
      clearTimeout(this.aIndex);
      this.aIndex = setTimeout(function() {
        self.aIndex = 0;
        body.removeChild(self.element);
        self.hidden = true;
      }, duration);

      return this;
    };

    /**
     * Hide Tooltip when shown, or show when hidden.
     *
     * @return {Tooltip}
     */
    Tooltip.prototype.toggle = function() {
      return this[this.hidden ? 'show' : 'hide']();
    };

    /**
     * Make the Tooltip window resize aware.
     *
     * @return {Void}
     */
    Tooltip.prototype._aware = function() {
      var index = indexOf(Tooltip.winAware, this);
      if (!~index) Tooltip.winAware.push(this);
    };

    /**
     * Remove the window resize awareness.
     *
     * @return {Void}
     */
    Tooltip.prototype._unaware = function() {
      var index = indexOf(Tooltip.winAware, this);
      if (~index) Tooltip.winAware.splice(index, 1);
    };

    /**
     * Destroy Tooltip instance.
     */
    Tooltip.prototype.destroy = function() {
      clearTimeout(this.aIndex);
      this._unaware();
      if (!this.hidden) body.removeChild(this.element);
      this.element = this.options = null;
    };

    /**
     * Handles repositioning of Tooltips on window resize.
     *
     * @return {Void}
     */
    Tooltip.reposition = (function() {
      var rAF =
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function(fn) {
          return setTimeout(fn, 17);
        };
      var rIndex;

      function requestReposition() {
        if (rIndex || !Tooltip.winAware.length) return;
        rIndex = rAF(reposition, 17);
      }

      function reposition() {
        rIndex = 0;
        var tip;
        for (var i = 0, l = Tooltip.winAware.length; i < l; i++) {
          tip = Tooltip.winAware[i];
          tip.position();
        }
      }

      return requestReposition;
    })();
    Tooltip.winAware = [];

    // Bind winAware repositioning to window resize event
    evt.bind(window, 'resize', Tooltip.reposition);
    evt.bind(window, 'scroll', Tooltip.reposition);

    /**
     * Array with dynamic class types.
     *
     * @type {Array}
     */
    Tooltip.classTypes = ['type', 'effect'];

    /**
     * Default options for Tooltip constructor.
     *
     * @type {Object}
     */
    Tooltip.defaults = {
      baseClass: 'tooltip', // Base Tooltip class name.
      typeClass: null, // Type Tooltip class name.
      effectClass: null, // Effect Tooltip class name.
      inClass: 'in', // Class used to transition stuff in.
      place: 'top', // Default place.
      spacing: null, // Gap between target and Tooltip.
      interactive: false, // Whether Tooltip should be interactive, or click through.
      auto: 0 // Whether to automatically adjust place to fit into window.
    };
  });

  require.register('tooltip/lib/tduration.js', function(exports, module) {
    var style = require('jkroso~computed-style@0.1.0');

    /**
     * Returns transition duration of an element in ms.
     *
     * @param {Element} element
     *
     * @return {Int}
     */
    module.exports = function transitionDuration(element) {
      var computed = style(element);
      var duration = String(computed.transitionDuration || computed.webkitTransitionDuration);
      var match = duration.match(/([0-9.]+)([ms]{1,2})/);
      if (match) {
        duration = Number(match[1]);
        if (match[2] === 's') duration *= 1000;
      }
      return duration | 0;
    };
  });

  if (typeof exports == 'object') {
    module.exports = require('tooltip');
  } else if (typeof define == 'function' && define.amd) {
    define('Tooltip', [], function() {
      return require('tooltip');
    });
  } else {
    (this || window)['Tooltip'] = require('tooltip');
  }
})();
