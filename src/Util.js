(function(){
    Idea.Util = {
        SVGNS: "http://www.w3.org/2000/svg",
        XMLNS: "http://www.w3.org/1999/xhtml",
        XLINKNS: 'http://www.w3.org/1999/xlink',
        MOUSE_EVENTS: ["click", "dblclick", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "mouseenter", "mouseleave"],
        KEYBOARD_EVENTS: ["keydown", "keypress", "keyup"],
        UINTREGEX: /^\d+$/,
        INTREGEX: /^\-?\d+$/,
        isHexColor: function(color){return /^#[0-9A-F]{6}$/i.test(color)},

        /*
         * css class manipulation methods hasClass, addClass, removeClass
         */

        // classList is available in ie8+ or ie10+ according to different sources; not in Opera Mini
        // thus we define jquery-like utility methods for manipulations with classes
        hasClass: function(element, className){
            if (element.classList)
              return element.classList.contains(className);
            else
              return new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
        },

        addClass: function(element, className){
            if (element.classList) {
                element.classList.add(className);
            }
            else
                element.className += ' ' + className;
        },

        removeClass: function(element, className){
            if (element.classList)
              element.classList.remove(className);
            else
              element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        },

        /*
         * normalizeMouseEvent and normalizeKeyboardEvent address inconsistencies
         * between event attributes in different browsers.
         * 
         * They take native browser events on input and return normalized event objects 
         * (that contain the same properties for all browsers). These methods are meant 
         * to be used in your event handlers, e.g.:
         *
         * function clickHandler(e){
         *     var nativeEvent = Idea.Util.normalizeMouseEvent(e);
         *     ... // something meaningful here should use nativeEvent
         * }
         *
         * TODO: maintain a test set for cross-browser tests of these methods.
         */

        normalizeMouseEvent: function(event){
            // ie has event undefined; instead, it has window.event
            event = event || window.event;

            // ie events have button property instead of which property and 
            // reasonable 1/2/4 key codes instead of 1/3/2 (alas, W3C chose 1/3/2).
            // We map event.button onto event.which as described here:
            // http://www.martinrinehart.com/early-sites/mrwebsite_old/examples/cross_browser_mouse_events.html
            var which = event.which ? event.which :
            event.button === 1 ? 1 :
            event.button === 2 ? 3 : 
            event.button === 4 ? 2 : 1;

            // ie has event.x/event.y instead of event.clientX/event.clientY
            var clientX = event.x || event.clientX;
            var clientY = event.y || event.clientY;

            // ie ain't got pageX/pageY, create them, using the code from:
            // http://javascript.ru/tutorial/events/properties#elementy-svyazannye-s-sobytiem
            var pageX, pageY;
            if (event.pageX){
                pageX = event.pageX;
                pageY = event.pageY;
            }
            else{
                // see here, how to check for null/undefined:
                // http://stackoverflow.com/questions/2559318/how-to-check-for-an-undefined-or-null-variable-in-javascript
                if (event.pageX == null && clientX != null ) { 
                    var html = document.documentElement;
                    var body = document.body;
                
                    pageX = clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0);
                    pageY = clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0);
                }                
            }

            // ie has srcElement instead of event.target
            var target = event.target || event.srcElement;

            // ie has fromElement/srcElement instead of target
            var relatedTarget;
            if (event.relatedTarget) relatedTarget = event.relatedTarget;
            if (!event.relatedTarget && event.fromElement) {
                relatedTarget = (event.fromElement == event.target) ? event.toElement : event.fromElement
            }

            var normalizedEvent = {
                target: target,
                nativeEvent: event,
                which: which,
                clientX: clientX,
                clientY: clientY,
                pageX: pageX,
                pageY: pageY
            }
            if (relatedTarget) normalizedEvent.relatedTarget = relatedTarget;
            return normalizedEvent;
        },

        /*
         * This function normalizes messy keyboard events. 
         *
         * First, I'll tell about the keyboard events mess, then I'll tell, what this function does.
         *
         *   There are 2 kinds of events in browsers, my friend: keypress and keydown/keyup.
         *   The difference is that character keys (alphanumeric and special symbols) when pressed 
         *   fire both keypress and keydown events, while special keys (Ctrl, Esc, Enter etc.) cause
         *   only keydown (no keypress) in most browsers except for special cases, such as 
         *   buggy Escape in Opera firing keypress without data.
         *   Both special and character keys cause keyup.
         *   See: http://javascript.info/tutorial/keyboard-events
         *
         * What keyboard event attributes exist?
         *
         *  - type can equal to "keypress", "keydown" or "keyup";
         *  - keyCode is an ASCII code (integer 0-255) of key on the keyboard;
         *  - charCode is a UTF-8-encoded character (respecting the selected language and upper/lower case);
         *  - which attribute equals to charCode, when it's available, otherwise to keyCode;
         *  - ctrlKey, altKey, shiftKey and metaKey are booleans, indicating modifier keys states (on/off).
         *
         *   For some rare keys keyCodes vary between different browsers, but this
         *   function doesn't address that problem by normalizing keyCodes in any ways.
         *   See: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
         *
         * What attributes are reliably (cross-browser-ly) available for each event?
         * 
         *   For special keys, we can obtain keyCode, but not charCode of that key.
         *
         *   For character keys, we sometimes can't obtain keyCode thanks to IE, but
         *   we can always obtain charCode.
         *
         * What this function does?
         *
         * This function expects all 3 types of keyboard events on input, 
         * it checks if the key pressed is special or character and
         *     - for special keys:
         *         + for keypress events (mistkingly fired) returns null
         *         + for keydown events sets the keyCode = which attributes
         *         + for keyup events sets keyCode = which attributes
         *     - for character keys
         *         + for keypress events sets the charCode = which attributes
         *         + for keydown events returns null
         *         + for keyup events sets keyCode = which attributes         
         *
         */

        normalizeKeyboardEvent: function(event){
            // These links seem to be obsolete:
            // see: http://javascript.info/tutorial/keyboard-events
            // see: http://blog.santoshrajan.com/2007/03/cross-browser-keyboard-handler.html

            var evt = event || window.event; // old ie has window.event

            var normalizedEvent = {
                nativeEvent: evt,
                type: evt.type,
                altKey: evt.altKey,
                shiftKey: evt.shiftKey,
                metaKey: evt.metaKey
            };

            // iterate over event types
            if (evt.type == "keyup"){ // process keyup regardless of special/character key
                normalizedEvent.keyCode = evt.keyCode;
                normalizedEvent.which = evt.keyCode;
                return normalizedEvent;
            }
            else if (evt.type == "keydown"){
                // check if the key is special or character
                // we can't do that like in keypress below, so we have to guess from keyCodes
                var characterNotSpecial;
                var keyCode = evt.keyCode;
                if (keyCode == 32 || // spacebar
                    (keyCode >= 48 && keyCode <= 90) || // alphanumerics
                    (keyCode >= 96 && keyCode <= 111 && keyCode != 108) || // numpad
                    (keyCode >= 160 && keyCode <= 176) || // special characters on numeric keyboard and right side
                    (keyCode >= 188 && keyCode <= 192) || // comma, period, backtick, slash and 189 for variant of Minuse
                    (keyCode >= 219 && keyCode <= 222)) { // backslash, square brackets, quotes etc.
                    characterNotSpecial = true;
                }
                else characterNotSpecial = false;

                if (characterNotSpecial) return null; // Already Handled on keydown
                else {
                    normalizedEvent.keyCode = evt.keyCode;
                    normalizedEvent.which = evt.keyCode;
                    return normalizedEvent;
                }

            }
            else if (evt.type == "keypress") {
                 // event.type must be keypress
                if (evt.which == null) { // IE puts charCode into keyCode for character keys
                    normalizedEvent.charCode = String.fromCharCode(evt.keyCode); // note that we can't get keyCode from IE
                    normalizedEvent.which = normalizedEvent.charCode;
                    return normalizedEvent;
                } 
                else if (evt.which !== 0 && evt.charCode !== 0) { // the rest
                    normalizedEvent.charCode = String.fromCharCode(evt.which);
                    normalizedEvent.which = normalizedEvent.charCode;
                    return normalizedEvent;
                }
                else { // Opera triggers keyPress without charCode for e.g. Escape
                    return null;
                }
            }

        },

        /*
         * Classical Douglas Crockford's extend.
         *
         * @method
         * @memberof Idea.Util
         * @param Child - Child constructor, whose prototype shall extend Parent's prototype
         * @param Parent - Parent constructor, whose prototype is extended
         */

        crockfordsExtend: function(Child, Parent){
            var F = function(){};
            F.prototype = Parent.prototype;
            Child.prototype = new F();
            Child.prototype.constructor = Child;
            Child.superclass = Parent.prototype;
        },

        /*
         * Variation of Crockford's extend with regard to getters/setters:
         * Sometimes I say e.g. new idea.Slide(), where idea.Slide is not
         * the real Slide constructor, but getter method, which returns the result
         * of binding of the actual Slide constructor to Idea instance:
         * Slide.bind(this) ("this" is idea instance, the getter is stored in,
         * so that within Slide constructor the idea instance is available as a variable,
         * automatically passed to the constructor. The problem is that prototype
         * of this bound constructor differs from prototype of unbound constructor.
         * Thus we store a reference to the real prototype of unbound constructor 
         * in "fn" variable of bound. This extend checks, whether "fn" attribute is
         * present or not in the Child and Parent and extends it, if it exists.
         *
         */

        extend: function(Child, Parent){
            var parent_prototype;
            if ("fn" in Parent){ parent_prototype = Parent.fn } // WARNING
            else { parent_prototype = Parent.prototype; }


            var F = function(){};
            F.prototype = parent_prototype;
            if ("fn" in Child) {
                Child.fn = new F();
                Child.fn.constructor = Child.cons;
                Child.cons.superclass = parent_prototype;
            }
            else {
                Child.prototype = new F();
                Child.prototype.constructor = Child;
                Child.superclass = parent_prototype;
            }  
        },

        /*
         * Dynamically adds attributes to constructor's prototype.
         *
         * @method
         * @memberof Idea.Util
         * @param constructor   constructor, its prototype will get new attrs.
         * @param attrs         object, whose attributes will get copied to
         *                      constructor.prototype.
         * 
         */

        addAttrsToPrototype: function(constructor, attrs){
            var key;
            if ("fn" in constructor){
                for (key in attrs){
                    constructor.fn[key] = attrs[key];
                }
            }
            else{
                for (key in attrs){
                    constructor.prototype[key] = attrs[key];
                }                
            }
        },

        /*
         * Creates, appends to father tag and returns SVG primitive 
         * (e.g. rect, group etc.).
         *
         * @method
         * @memberof Idea.Util
         * @param father  svg element that is the parent of newly created one, or undefined/null.
         * @param tag     type of newly created svg element (e.g. 'rect' or 'g').
         * @param attrs   object with attributes of newly created element.
         * @returns       newly created element
         *
         */

        createSVGElement: function(father, tag, attrs){
            var elem = document.createElementNS(this.SVGNS, tag); // create element

            for (var key in attrs){ // populate elem's attributes with hrefs created in XLINKS namespace
                if (attrs[key] !== undefined) {
                    if (key == "xlink:href") elem.setAttributeNS(this.XLINKNS, 'href', attrs[key]);
                    else elem.setAttribute(key, attrs[key]);
                }
            }

            if (father) father.appendChild(elem);
            return elem;
        },

        /*
         * Given coordinates of mouse event in window coordinate system
         * (e.g. (event.clientX, event.clientY)) that happened within an <svg> element,
         * returns the canvas coordinates (we call that <svg> element "canvas") of
         * that location. We also call those coordinates "viewbox" coordinates
         * or "real world" coordinates.
         *
         * For description of coordinate systems, see:
         *     http://www.w3.org/TR/SVG/coords.html
         *     http://sarasoueidan.com/blog/svg-coordinate-systems/
         * 
         * Note: coordinate system of an element within svg canvas (e.g. <rect>)
         * may differ from global canvas coordinate system, if transformations 
         * (e.g. rotation) are applied to your <rect> - your <rect>'s coordinate 
         * system will be rotated relative to canvas coordinate system.
         *
         * Note: if rotation is applied to your element, it also has a
         * different boundingclientrect.
         *   http://phrogz.net/getboundingclientrect-is-lame-for-svg
         *
         * Note: this also assumes that preserveAspectRatio on canvas is disabled.
         *
         * @method
         * @memberof Idea.Util
         * @param x         user coordinates x
         * @param y         user coordinates y
         * @param canvas    svg canvas where the mouse event happened
         * 
         */

        windowCoordsToCanvasCoords: function(x, y, canvas){
            // Note the difference between getBoundingClientRect() and getBBox():
            // http://stackoverflow.com/questions/6179173/how-is-the-getbbox-svgrect-calculated

            var canvasRectangle = canvas.getBoundingClientRect(); // this is relative to window - the browser viewport

            var canvasTopOffset = y - canvasRectangle.top - canvas.clientTop; // in window coordinates
            var canvasLeftOffset = x - canvasRectangle.left - canvas.clientLeft; // in window coordinates

            var viewbox = canvas.getAttributeNS(null, 'viewBox');
            var viewboxDimensions = viewbox.split(" ");
            viewboxDimensions.forEach(function(element, index, array){array[index] = parseInt(element);})

            var canvasToUserXRatio = viewboxDimensions[2] / canvasRectangle.width;
            var canvasToUserYRatio = viewboxDimensions[3] / canvasRectangle.height;

            var canvasX = parseInt(viewboxDimensions[0] + canvasToUserXRatio * canvasLeftOffset);
            var canvasY = parseInt(viewboxDimensions[1] + canvasToUserYRatio * canvasTopOffset);
            var canvasCoords = {x: canvasX, y: canvasY};
            return canvasCoords;
        },
        
        /*
         * Idea.js makes use of getterSetters (possibly overloaded) to
         * access attributes. E.g. you can say widget.opacity() to obtain
         * opacity value of your widget and say widget.opacity(0.5) to set
         * its opacity to 50%. So the same method "opacity" acts both as
         * getter and setter.
         * 
         * When you invoke setter, Idea.js checks that you supplied an
         * appropriate value to it - performs "validation". E.g. opacity
         * value should be a non-negative float between 0 and 1 and when you
         * call widget.opacity(value), it first validates the value, i.e. 
         * checks that it is between 0 and 1, before assigning opacity to it.
         *
         * In order to re-use the simplest and most common getterSetters, 
         * we store factory functions, generating them, here.
         */ 

        /*
         * Factory function that returns getterSetter function, which,
         * as getter, returns value of argName or, as setter, validates
         * input value, checking, if it's an unsigned integer.
         * 
         * @function
         * @memberof Idea.Util
         * @param argName  name of argument to get/set with this method.
         */

        uintGetterSetter: function(argName){
            return function(arg){
                if (arg === undefined) {return this["_"+argName];}
                else {
                    Idea.Util.uintValidator(arg, argName);
                    this["_"+argName] = arg;
                }
            };
        },

        uintValidator: function(arg, argName){
            if (!Idea.Util.UINTREGEX.test(arg)) throw new Error(argName + " should be unsigned int, got: '" + arg + "'!");
        },

        intValidator: function(arg, argName){
            if (!Idea.Util.INTREGEX.test(arg)) throw new Error(argName + " should be int, got: '" + arg + "'!");
        },

        /*
         * Factory function that returns getterSetter function, which,
         * as getter, returns value of argName or, as setter, validates
         * input value, checking, if it's a color literal.
         * 
         * @function
         * @memberof Idea.Util
         * @param argName  name of argument to get/set with this method.
         */

        colorGetterSetter: function(argName){
            //TODO!!! COLOR literals, e.g. rgb, rgba or trivial color names
            return function(arg){
                if (arg === undefined) {return this["_"+argName];}
                else {
                    if (Idea.Util.isHexColor(arg)){ this["_"+argName] = arg;}
                    else {
                        throw new Error(argName + " should be a valid color string, e.g #ACDC66, got: '" + arg + "'!");
                    }
                }
            };
        },

        /*
         * Factory function that returns getterSetter function, which,
         * as getter, returns value of argName or, as setter, validates
         * input value, checking, if it's a Util.Widget subclass.
         * 
         * @function
         * @memberof Idea.Util
         * @param argName  name of argument to get/set with this method.
         */

        widgetGetterSetter: function(argName){
            return function(arg){
                if (arg === undefined) {return this["_"+argName];}
                else {
                    if (arg instanceof Idea.prototype.Widget) {this["_"+argName] = arg;}
                    else {throw new Error(argName + "should be a Util.prototype.Widget subclass, got:'" + typeof arg + "'!");}
                }
            };
        }

    };
})();
