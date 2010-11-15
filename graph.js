/*==================================================
 *  Exhibit.GraphView
 *==================================================
 */

SimileAjax.RemoteLog = {possiblyLog : function() {}};

Exhibit.GraphView = function(containerElmt, uiContext, html) {
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._settings = {};
    this._accessors = {};

    var view = this;
    this._listener = {
        onItemsChanged: function() {
            view._reconstruct();
        }
    };
    uiContext.getCollection().addListener(this._listener);

};

Exhibit.GraphView._settingSpecs = {
    "nodeWeightType": {type: "text", defaultValue: "linear", choices: ["linear", "log", "cuberoot"]},
    "nodeWeightScale": {type: "float", defaultValue: 1},
    "edges": {type: "text", defaultValue: null},
    "nodes": {type: "text", defaultValue: null},


    "plotHeight":   { type: "int",   defaultValue: 400 },
    "bubbleWidth":  { type: "int",   defaultValue: 400 },
    "bubbleHeight": { type: "int",   defaultValue: 300 },
    "xAxisMin":     { type: "float", defaultValue: Number.POSITIVE_INFINITY },
    "xAxisMax":     { type: "float", defaultValue: Number.NEGATIVE_INFINITY },
    "xAxisType":    { type: "enum",  defaultValue: "linear", choices: [ "linear", "log" ] },
    "yAxisMin":     { type: "float", defaultValue: Number.POSITIVE_INFINITY },
    "yAxisMax":     { type: "float", defaultValue: Number.NEGATIVE_INFINITY },
    "yAxisType":    { type: "enum",  defaultValue: "linear", choices: [ "linear", "log" ] },
    "xLabel":       { type: "text",  defaultValue: "x" },
    "yLabel":       { type: "text",  defaultValue: "y" },
    "color":        { type: "text",  defaultValue: "#5D7CBA" },
    "colorCoder":   { type: "text",  defaultValue: null },
    "scroll":       { type: "boolean", defaultValue: false }
};

Exhibit.GraphView._accessorSpecs = [
    {
        accessorName: "getNodeColorGrouper",
        attributeName: "nodeColorGrouper",
//        type: "string",
    },
    {
        accessorName: "getText",
        attributeName: "text",
//        type: "string",
    },
    {
        accessorName: "getX",
        attributeName: "xAxis",
//        type: "string",
    },
    {
        accessorName: "getEdgeColor",
        attributeName: "edgeColor",
        type: "string",
    },
    {
        accessorName: "getEdgeWeight",
        attributeName: "edgeWeight",
        type: "float",
    },
    {
        accessorName: "getNodeWeight",
        attributeName: "nodeWeight",
        type: "float",
    },
    {
        accessorName: "getSource",
        attributeName: "source"
    },
    {
        accessorName: "getType",
        attributeName: "type"
    },
    {
        accessorName: "getTarget",
        attributeName: "target"
    },

];

Exhibit.GraphView.create = function(configElmt, containerElmt, uiContext) {
    var view = new Exhibit.GraphView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.GraphView._configure(view, configuration);
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.GraphView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.GraphView._settingSpecs, view._settings);

    view._configure();
    view._reconstruct();
    return view;

        
};

Exhibit.GraphView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var d = document.createElement('div');
    configElmt.appendChild(d);

    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.GraphView(
        containerElmt != null ? containerElmt : configElmt,
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );

    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.GraphView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.GraphView._settingSpecs, view._settings);

    view._configure();
    view._reconstruct();
    return view;

};

Exhibit.GraphView.prototype._configure = function() {
    this._nodeWeightFunc = this._weightFuncs[this._settings.nodeWeightType]; 
}

Exhibit.GraphView.prototype._weightFuncs = {
    linear: function(weight, scale) {
        return weight * this._settings.nodeWeightScale * Math.pow(scale, -1.5);
    },
    log: function(weight, scale) {
        return 1+Math.log(weight) * this._settings.nodeWeightScale * Math.pow(scale, -1.5);
    },
    cuberoot: function(weight, scale) {
        return Math.pow(weight, (1/3)) * this._settings.nodeWeightScale * Math.pow(scale, -1.5);
    }
};

Exhibit.GraphView.prototype._getType = function(itemID, database) {
    var type = null;
    
    this._accessors.getType(itemID, database, function(_type) {
        type = _type;
    });
    return type;
}

Exhibit.GraphView.prototype._preprocessDataForProtovis = function() {
    var accessors = this._accessors;
    var nodes = this._nodes = {};
    var links = this._links = {};
    var self = this;

    this._uiContext.getCollection().getAllItems().visit(function(itemID) {
        if (self._getType(itemID, database) != self._settings.nodes)
            return;

        var weight = 1, x = null, text = null, colorGrouper = null;
        accessors.getText(itemID, database, function(_text) {
            text = _text;
        });
        accessors.getNodeWeight(itemID, database, function(_weight) {
            weight = _weight;
        });
        accessors.getNodeColorGrouper(itemID, database, function(_colorGrouper) {
            colorGrouper = _colorGrouper;
        });
        accessors.getX(itemID, database, function(_x) {
            var d = new Date(_x+"");
            year = new Date(d.getFullYear(), 0, 1).valueOf();
            next_year = new Date(d.getFullYear()+1, 0, 1).valueOf();
            x = d.getFullYear() + (d.valueOf() - year) / (next_year - year);
        });
        nodes[itemID] = {
            nodeName: text,
            weight: weight,
            px: x,
            text: text,
            group: colorGrouper,
        };
    });
    this._uiContext.getCollection().getAllItems().visit(function(itemID) {
        if (self._getType(itemID, database) != self._settings.edges)
            return;

        var source = null, target = null, color = '#888', weight = null;
        accessors.getSource(itemID, database, function(x) { source = x; });
        accessors.getTarget(itemID, database, function(x) { target = x; });
        accessors.getEdgeColor (itemID, database, function(x) { color  = x; });
        accessors.getEdgeWeight(itemID, database, function(x) { weight = x; });

        links[itemID] = {
            sourceID: source,
            targetID: target,
            color:  color,
            value:  weight,
        };
    });
};

Exhibit.GraphView.prototype._dataForProtovis = function() {
    if (this._nodes == undefined)
        this._preprocessDataForProtovis();
    var self = this, nodes = this._nodes, links = this._links;
    var filteredNodes = [], filteredLinks = [], nodeIDs = {}, i = 0;
    this._uiContext.getCollection().getRestrictedItems().visit(function(itemID) {
        if (self._getType(itemID, database) != self._settings.nodes)
            return;
        filteredNodes.push(nodes[itemID]);
        nodeIDs[itemID] = i++;
    });
    for (linkID in links) {
        link = links[linkID];
        if (!(link.sourceID in nodeIDs && link.targetID in nodeIDs))
            continue;
        links[linkID].source = nodeIDs[link.sourceID];
        links[linkID].target = nodeIDs[link.targetID];
        filteredLinks.push(links[linkID]);
    }
    
    return {
        nodes: filteredNodes,
        links: filteredLinks,
    };
}

Exhibit.GraphView.prototype._reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    var currentSet = collection.getRestrictedItems();

    var w = 900,
        h = 300;
    //    x = pv.Scale.log(1, 50).range(0, w);
    var x = Exhibit.GraphView.neg_log_scale(1970, 2008.5).range(0, w);
    var y = pv.Scale.log(0, 1200).range(0, h);

    var vis = new pv.Panel()
        .canvas(self._div)
        .bottom(30).top(5).left(30).right(30)
        .width(w)
//        .fillStyle('#00ff00')
        .height(h);

/*
    vis.add(pv.Rule)
        .data(y.ticks())
        .left(0)
        .bottom(y)
        .strokeStyle(function(d) d ? "#eee" : "#000")
        .anchor("left").add(pv.Label)
            .textMargin(8);
*/

    vis.add(pv.Rule)
        .data(x.ticks())
        .bottom(0)
        .left(x)
        .strokeStyle(function(d) d ? "#eee" : "#000")
        .anchor("bottom").add(pv.Label)
            .textMargin(8);
//            .text(x.tickFormat);
//
    var network = vis.add(Exhibit.GraphView.force_layout).iterations(0);
    network.xScale(function() {return x;});
    network.yScale(function() {return y;});
    
    vis.event("mousedown", pv.Behavior.pan())
       .event("mousewheel", pv.Behavior.zoom());

    // Load our data
    protovisData = self._dataForProtovis();
    network.nodes(protovisData.nodes).links(protovisData.links);

    colors = pv.Colors.category10();

    network.link.add(pv.Line)
                .strokeStyle("#999") //function() { return this.targetNode.fix ? "#080" : "#999"; })
                .lineWidth(1)
                .add(pv.Dot)
                .data(function(l) {
                    // Place the arrows in the middle of the arcs
                    return [{
                        x: (l.targetNode.x + l.sourceNode.x) / 2,
                        y: (l.targetNode.y + l.sourceNode.y) / 2,
                    }]
                 })
                .angle(function (n,l) {
                    return Math.atan2(l.targetNode.y - l.sourceNode.y, l.targetNode.x - l.sourceNode.x) - Math.PI/2
                })
                .shape("triangle")
                  .fillStyle("#999")
//                .fillStyle(function(n, l) { return self._edgeColorFunc(); })
                .size(4);
                
    network.node.add(pv.Dot)
                .size(function(d) self._nodeWeightFunc(d.weight, this.scale))
                .fillStyle(function(d) d.fix ? "brown" : colors(d.group))
                .strokeStyle(function() this.fillStyle().darker())
                .lineWidth(1)
                .title(function(d) d.nodeName)
                //.left(x.by(function(d) { return d.px; }))
                .event("mousedown", Exhibit.GraphView.drag_behavior())
                .event("drag", network)
                //.event("click", function(n) { alert(n.text); });

    vis.render();
};

Exhibit.GraphView.drag_behavior = function() {
  var scene, // scene context
      index, // scene context
      p, // particle being dragged
      v1, // initial mouse-particle offset
      max;

  /** @private */
  function mousedown(d) {
    index = this.index;
    scene = this.scene;
    var m = this.mouse();
    v1 = ((p = d).fix = pv.vector(d.x, d.y)).minus(m);
    max = {
      x: this.parent.width() - (d.dx || 0),
      y: this.parent.height() - (d.dy || 0)
    };
    scene.mark.context(scene, index, function() { this.render(); });
    pv.Mark.dispatch("dragstart", scene, index);
  }

  /** @private */
  function mousemove() {
    if (!scene) return;
    scene.mark.context(scene, index, function() {
        var m = this.mouse();
 //       p.x = p.fix.x = Math.max(0, Math.min(v1.x + m.x, max.x));
        p.y = p.fix.y = Math.max(0, Math.min(v1.y + m.y, max.y));
        this.render();
      });
    pv.Mark.dispatch("drag", scene, index);
  }

  /** @private */
  function mouseup() {
    if (!scene) return;
    p.fix = null;
    scene.mark.context(scene, index, function() { this.render(); });
    pv.Mark.dispatch("dragend", scene, index);
    scene = null;
  }

  pv.listen(window, "mousemove", mousemove);
  pv.listen(window, "mouseup", mouseup);
  return mousedown;
};

Exhibit.GraphView.force_layout = function() {
  pv.Layout.Network.call(this);

  /* Force-directed graphs can be messy, so reduce the link width. */
  this.link.lineWidth(function(d, p) { return Math.sqrt(p.linkValue) * 1.5; });
  this.label.textAlign("center");
};

Exhibit.GraphView.force_layout.prototype = pv.extend(pv.Layout.Force).property('xScale').property('yScale');

Exhibit.GraphView.force_layout.prototype.defaults = new Exhibit.GraphView.force_layout()
    .extend(pv.Layout.Force.prototype.defaults);

/** @private Initialize the physics simulation. */
Exhibit.GraphView.force_layout.prototype.buildImplied = function(s) {

  /* Any cached interactive layouts need to be rebound for the timer. */
  if (pv.Layout.Network.prototype.buildImplied.call(this, s)) {
    var f = s.$force;
    if (f) {
      f.next = this.binds.$force;
      this.binds.$force = f;
    }
    return;
  }

  var that = this,
      nodes = s.nodes,
      links = s.links,
      k = s.iterations,
      w = s.width,
      h = s.height;
  var xScale = this.xScale(), yScale = this.yScale();

  /* Initialize positions randomly near the center. */
  for (var i = 0, n; i < nodes.length; i++) {
    n = nodes[i];
    if (xScale) n.x = xScale(n.px);
    if (yScale) n.y = xScale(n.py);
    if (isNaN(n.x)) n.x = w / 2 + 200 * Math.random() - 100;
    if (isNaN(n.y)) n.y = h / 2 + 200 * Math.random() - 100;
  }

  /* Initialize the simulation. */
  var sim = pv.simulation(nodes);

  /* Drag force. */
  sim.force(pv.Force.drag(s.dragConstant));

  /* Charge (repelling) force. */
  sim.force(pv.Force.charge(s.chargeConstant)
      .domain(s.chargeMinDistance, s.chargeMaxDistance)
      .theta(s.chargeTheta));

  /* Spring (attracting) force. */
  sim.force(pv.Force.spring(s.springConstant)
      .damping(s.springDamping)
      .length(s.springLength)
      .links(links));

  /* Position constraint (for interactive dragging). */
  sim.constraint(pv.Constraint.position());
  //sim.constraint(pv.Constraint.position(function(p) { return {x: xScale(p.px), y: p.y}}));

  /* Optionally add bound constraint. TODO: better padding. */
  if (s.bound) {
    sim.constraint(pv.Constraint.bound().x(6, w - 6).y(6, h - 6));
  }

  /** @private Returns the speed of the given node, to determine cooling. */
  function speed(n) {
    return n.fix ? 1 : n.vx * n.vx + n.vy * n.vy;
  }

  /*
   * If the iterations property is null (the default), the layout is
   * interactive. The simulation is run until the fastest particle drops below
   * an arbitrary minimum speed. Although the timer keeps firing, this speed
   * calculation is fast so there is minimal CPU overhead. Note: if a particle
   * is fixed for interactivity, treat this as a high speed and resume
   * simulation.
   */
  if (k == null) {
    sim.step(); // compute initial previous velocities
    sim.step(); // compute initial velocities

    /* Add the simulation state to the bound list. */
    var force = s.$force = this.binds.$force = {
      next: this.binds.$force,
      nodes: nodes,
      min: 1e-4 * (links.length + 1),
      sim: sim
    };

    /* Start the timer, if not already started. */
    if (!this.$timer) this.$timer = setInterval(function() {
      var render = false;
      for (var f = that.binds.$force; f; f = f.next) {
        if (pv.max(f.nodes, speed) > f.min) {
          f.sim.step();
          render = true;
        }
      }
//      for (var n in ns) {
//          ns[n].x = xScale(ns[n].px);
//      }
      for (var n = nodes; n; n = n.next) {
          n.x = xScale(n.px);
      }
      if (render) that.render();
    }, 2000);
  } else for (var i = 0; i < k; i++) {
    sim.step();
  }
};

Exhibit.GraphView.neg_log_scale = function() {
  var scale = pv.Scale.quantitative(1, 10),
      b, // logarithm base
      p, // cached Math.log(b)
      /** @ignore */ log = function(x) { return Math.log(scale.domain()[1]+1-x) / p;},
      /** @ignore */ pow = function(y) { return scale.domain()[1]+1 - Math.pow(b, y); };
//      /** @ignore */ log = function(x) { return Math.log(x) / p; },
//      /** @ignore */ pow = function(y) { return Math.pow(b, y); };

  /**
   * Returns an array of evenly-spaced, suitably-rounded values in the input
   * domain. These values are frequently used in conjunction with
   * {@link pv.Rule} to display tick marks or grid lines.
   *
   * @function
   * @name pv.Scale.log.prototype.ticks
   * @returns {number[]} an array input domain values to use as ticks.
   */
  scale.ticks = function() {
      return [1970,1980, 1990, 1995, 2000, 2002, 2004, 2006, 2007, 2008, 2009];
    // TODO support non-uniform domains
    var d = scale.domain(),
        n = d[0] < 0,
        i = Math.floor(n ? -log(-d[0]) : log(d[0])),
        j = Math.ceil(n ? -log(-d[1]) : log(d[1])),
        ticks = [];
    if (n) {
      ticks.push(-pow(-i));
      for (; i++ < j;) for (var k = b - 1; k > 0; k--) ticks.push(-pow(-i) * k);
    } else {
      for (; i < j; i++) for (var k = 1; k < b; k++) ticks.push(pow(i) * k);
      ticks.push(pow(i));
    }
    for (i = 0; ticks[i] < d[0]; i++); // strip small values
    for (j = ticks.length; ticks[j - 1] > d[1]; j--); // strip big values
    return ticks.slice(i, j);
  };

  /**
   * Formats the specified tick value using the appropriate precision, assuming
   * base 10.
   *
   * @function
   * @name pv.Scale.log.prototype.tickFormat
   * @param {number} t a tick value.
   * @returns {string} a formatted tick value.
   */
  scale.tickFormat = function(t) {
    return t.toPrecision(1);
  };

  /**
   * "Nices" this scale, extending the bounds of the input domain to
   * evenly-rounded values. This method uses {@link pv.logFloor} and
   * {@link pv.logCeil}. Nicing is useful if the domain is computed dynamically
   * from data, and may be irregular. For example, given a domain of
   * [0.20147987687960267, 0.996679553296417], a call to <tt>nice()</tt> might
   * extend the domain to [0.1, 1].
   *
   * <p>This method must be invoked each time after setting the domain (and
   * base).
   *
   * @function
   * @name pv.Scale.log.prototype.nice
   * @returns {pv.Scale.log} <tt>this</tt>.
   */
  scale.nice = function() {
    // TODO support non-uniform domains
    var d = scale.domain();
    return scale.domain(pv.logFloor(d[0], b), pv.logCeil(d[1], b));
  };

  /**
   * Sets or gets the logarithm base. Defaults to 10.
   *
   * @function
   * @name pv.Scale.log.prototype.base
   * @param {number} [v] the new base.
   * @returns {pv.Scale.log} <tt>this</tt>, or the current base.
   */
  scale.base = function(v) {
    if (arguments.length) {
      b = Number(v);
      p = Math.log(b);
      scale.transform(log, pow); // update transformed domain
      return this;
    }
    return b;
  };

  scale.domain.apply(scale, arguments);
  return scale.base(10);
};
