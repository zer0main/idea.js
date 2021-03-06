(function(){
    var x1GetterSetter = Idea.Util.getterSetter("x1", Idea.Validators.intValidator, null);
    var y1GetterSetter = Idea.Util.getterSetter("y1", Idea.Validators.intValidator, null);
    var x2GetterSetter = Idea.Util.getterSetter("x2", Idea.Validators.intValidator, null);
    var y2GetterSetter = Idea.Util.getterSetter("y2", Idea.Validators.intValidator, null);
    var strokeGetterSetter = Idea.Util.getterSetter("stroke", Idea.Validators.colorValidator, null);
    var strokeWidthGetterSetter = Idea.Util.getterSetter("strokeWidth", Idea.Validators.uintValidator, null);

    var baseMarkerGetterSetter = Idea.Util.getterSetter("baseMarker", Idea.Validators.objectValidator, null);
    var tipMarkerGetterSetter = Idea.Util.getterSetter("tipMarker", Idea.Validators.objectValidator, null);

    /*
     * Straight line
     *
     * @memberof Idea
     * @constructor
     * @param owner       Idea.Canvas.Slide or its child Object that contains
                          the line.
     * @param father      Util.Object, parental to Line, or Canvas,
     *                    if Line doesn't have a parent and is drawn right
                          on the canvas.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @param stroke
     * @param strokeWidth
     * @param baseMarker see tipMarker.
     * @param tipMarker  arbitrary markers that represent base and tip of 
     *                    line (if not specified, Triangles will be 
     *                    created and used by default).
     */

    var Line = function(owner, father, x1, y1, x2, y2, stroke, strokeWidth, baseMarker, tipMarker){
        Idea.Object.call(this);

        // TODO allow to use other objects dock points to be used 
        // as base and tip instead of just coordinates. Then line will
        // stick to objects.
        x1GetterSetter.call(this, x1);
        y1GetterSetter.call(this, y1);
        x2GetterSetter.call(this, x2);
        y2GetterSetter.call(this, y2);

        if (stroke === undefined) strokeGetterSetter.call(this, "#AAAAAA");
        else strokeGetterSetter.call(this, stroke);        

        if (strokeWidth === undefined) strokeWidthGetterSetter.call(this, 1);
        else strokeWidthGetterSetter.call(this, strokeWidth);

        if (baseMarker === undefined) this._baseMarker = null;
        else baseMarkerGetterSetter.call(this, baseMarker);

        if (tipMarker === undefined) this._tipMarker = null;
        else tipMarkerGetterSetter.call(this, tipMarker);

        this.father = father;

        //draw primitives
        this._group = Idea.Util.createSVGElement(this.father, 'g', {});
        this._drawing = Idea.Util.createSVGElement(this._group, 'line', {
            "x1": this.x1(),
            "y1": this.y1(),
            "x2": this.x2(),
            "y2": this.y2(),
            "stroke": this.stroke(),
            "stroke-width": this.strokeWidth()
        });

        this._baseHandle = Idea.Util.createSVGElement(this._group, 'circle', {
            "cx": this.x1(),
            "cy": this.y1(),
            "r": 3,
            "stroke": "#c9c9c9",
            "fill": "#FFFFFF"
        });
        this.handles.push(this._baseHandle);

        this._tipHandle = Idea.Util.createSVGElement(this._group, 'circle', {
            "cx": this.x2(),
            "cy": this.y2(),
            "r": 3,
            "stroke": "#c9c9c9",
            "fill": "#FFFFFF"
        });
        this.handles.push(this._tipHandle);

        this._vicinity = Idea.Util.createSVGElement(this._group, 'line', {
            "x1": this.x1(),
            "y1": this.y1(),
            "x2": this.x2(),
            "y2": this.y2(),
            "stroke": this.stroke(),
            "stroke-linecap": "square",
            "stroke-width": this.strokeWidth() + 10,
            "opacity": 0
        });
        // note there are bugs with groups of objects, see: https://code.google.com/p/chromium/issues/detail?id=424969
        // http://jsfiddle.net/542afcfg/1/

        Idea.Util.observe(this, "x1", function(newValue, oldValue){
            this._drawing.setAttribute("x1", newValue);
            this._vicinity.setAttribute("x1", newValue);
            this._baseHandle.setAttribute("cx", newValue);
        }.bind(this));
        Idea.Util.observe(this, "y1", function(newValue, oldValue){
            this._drawing.setAttribute("y1", newValue);
            this._vicinity.setAttribute("y1", newValue);
            this._baseHandle.setAttribute("cy", newValue);
        }.bind(this));
        Idea.Util.observe(this, "x2", function(newValue, oldValue){
            this._drawing.setAttribute("x2", newValue);
            this._vicinity.setAttribute("x2", newValue);
            this._tipHandle.setAttribute("cx", newValue);
        }.bind(this));
        Idea.Util.observe(this, "y2", function(newValue, oldValue){
            this._drawing.setAttribute("y2", newValue);
            this._vicinity.setAttribute("y2", newValue);
            this._tipHandle.setAttribute("cy", newValue);
        }.bind(this));
        Idea.Util.observe(this, "stroke", function(newValue, oldValue){this._drawing.setAttribute("stroke", newValue);}.bind(this));
        Idea.Util.observe(this, "strokeWidth", function(newValue, oldValue){
            this._drawing.setAttribute("stroke-width", newValue);
            this.vicinity.setAttribute("stroke-width", newValue);
        }.bind(this));

    };

    /*
     * EVENT HANDLERS section. All the functions below should be bound to idea object, so that
     * "this" in them is idea object:
     *
     * Idea.Util.addEventListener(this.canvas._canvas, "click", baseMouseClick, false, this, []);
     */

    var baseMouseClick = function(e){
        // create a point and mousemove listener
        var event = Idea.Util.normalizeMouseEvent(e);
        var canvasCoords = Idea.Util.windowCoordsToCanvasCoords(event.clientX, event.clientY, this.canvas._canvas);

        // draw the base on canvas
        this._new = new Line(this, this.canvas._canvas, canvasCoords.x, canvasCoords.y, canvasCoords.x, canvasCoords.y, "#000000", 1);

        // remove this listener and add mouseover, mouseclick and keydown handlers
        Idea.Util.removeEventListener(this.canvas._canvas, "click", baseMouseClick, false, this, []);

        Idea.Util.addEventListener(window, "keypress", tipKeyDown, false, this, []);
        Idea.Util.addEventListener(window, "keydown", tipKeyDown, false, this, []);

        Idea.Util.addEventListener(this.canvas._canvas, "mousemove", tipMouseMove, false, this, []);
        Idea.Util.addEventListener(this.canvas._canvas, "click", tipMouseClick, false, this, []);
    };

    var returnFromLineCreation = function(){
        // remove creation listeners
        Idea.Util.removeEventListener(window, "keypress", tipKeyDown, false, this, []);
        Idea.Util.removeEventListener(window, "keydown", tipKeyDown, false, this, []);

        Idea.Util.removeEventListener(this.canvas._canvas, "mousemove", tipMouseMove, false, this, []);
        Idea.Util.removeEventListener(this.canvas._canvas, "click", tipMouseClick, false, this, []);

        // untoggle the line creation button
        this.icon.toggle();

        // switch from creation mode back to edit mode
        this.mode('edit');

        // delete this._new that contained just created this Object
        delete this._new;
    };

    var tipMouseMove = function(e){
        var event = Idea.Util.normalizeMouseEvent(e);
        var canvasCoords = Idea.Util.windowCoordsToCanvasCoords(event.clientX, event.clientY, this.canvas._canvas);
        //console.log("event.clientX = ", event.clientX, "event.clientY = ", event.clientY);        
        //console.log("canvas coords relative to this.canvas._canvas = ", canvasCoords);
        this._new.x2(canvasCoords.x);
        this._new.y2(canvasCoords.y);
    };

    var tipKeyDown = function(e){
        var event = Idea.Util.normalizeKeyboardEvent(e);
        if (event == null) return; // just ignore this event, if it should be ignored
        if (event.type == "keydown" && event.keyCode == 27) { // if this is keydown event on Escape key, destroy this Line and return to edit mode
            this._new.destroy();
            returnFromLineCreation.bind(this)();
        }
    };

    var tipMouseClick = function(e){
        var obj = this._new;
        this.layers.push(obj);

        returnFromLineCreation.bind(this)();

        Idea.Util.addEventListener(obj._vicinity, "mouseover", obj.vicinityMouseOver, false, this, [obj]);
        Idea.Util.addEventListener(obj._vicinity, "mouseleave", obj.vicinityMouseLeave, false, this, [obj]);
        Idea.Util.addEventListener(obj._vicinity, "mousedown", obj.vicinityMouseDown, false, this, [obj]);

        Idea.Util.addEventListener(obj._vicinity, "mousedown", obj.translateMouseDown, false, this, [obj]);
    };

    /*
     * END OF EVENT HANDLERS
     */

    var iconLabel = Idea.Util.createSVGElement(null, 'svg', {width: Idea.Conf.objectIconWidth, height: Idea.Conf.objectIconHeight});
    var line = Idea.Util.createSVGElement(iconLabel, 'line', {x1: parseInt(Idea.Conf.objectIconWidth/10), y1: parseInt(Idea.Conf.objectIconHeight/10), x2: parseInt(Idea.Conf.objectIconWidth*9/10), y2: parseInt(Idea.Conf.objectIconHeight*9/10), stroke: "#AAAAAA"});
    var iconHandlers = [["click", baseMouseClick, false]];

    Idea.Util.extend(Line, Idea.Object);
    Idea.Util.addAttrsToPrototype(Line, {
        x1: x1GetterSetter, 
        y1: y1GetterSetter,
        x2: x2GetterSetter,
        y2: y2GetterSetter,
        stroke: strokeGetterSetter,
        strokeWidth: strokeWidthGetterSetter,
        baseMarker: baseMarkerGetterSetter,
        tipMarker: tipMarkerGetterSetter,
        iconHandlers: iconHandlers,
        iconLabel: iconLabel,
    });

    Idea.Line = Line;
    Idea.ObjectsRegistry["Primitives"].push(Line);
})();
