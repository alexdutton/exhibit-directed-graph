/*==================================================
 *  Exhibit.GraphView
 *==================================================
 */

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
    "nodeWeightType": {type: "text", defaultValue: "linear", choices: ["linear", "log"]},
    "nodeWeightScale": {type: "float", defaultValue: 1},



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
    {   accessorName: "getEdges",
        attributeName: "edges"
    },
    {   accessorName: "getNodeWeight",
        attributeName: "nodeWeight"
    },
];

Exhibit.GraphView.create = function(configElmt, containerElmt, uiContext) {
    var view = new Exhibit.GraphView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.GraphView._configure(view, configuration);
    
    view._configure();
    view._reconstruct();
    return view;

        
};

Exhibit.GraphView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var d = document.createElement('div');
    configElmt.appendChild(d);
    for (k in self)
        d.innerHTML += k + ' ';
    d.innerHTML += "{"+configElmt.id+"}";

    
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
        return Math.log(weight) * this._settings.nodeWeightScale * Math.pow(scale, -1.5);
    }
};

Exhibit.GraphView.prototype._dataForProtovis(currentSet) {
    var nodes = [], nodeNames = {};
    var links = [];

    var i = 0;
    currentSet.visit(function(itemID) {
        var weight = 1;
        accessors.getNodeWeight(itemID, database, function(_weight) {
            weight = _weight;
        });
    	  nodes.push({
    	  	   nodeName: itemID,
    	  	   weight: weight,
    	  });
    	  nodeNames[itemID] = i++;
    });
    currentSet.visit(function(itemID) {
    	  accessors.getEdges(itemID, database, function(target) {
    	  	   links.push({
    	  	       source: nodeNames[itemID],
    	  	       target: nodeNames[target],
    	  	       value: 1
    	  	   });
    	  });
    });
    
    return {
        nodes: nodes,
        links: links,
    };
}

Exhibit.GraphView.prototype._reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    var currentSet = collection.getRestrictedItems();

    var vis = new pv.Panel().canvas(self._div);
    var network = vis.add(pv.Layout.Force)
    
    vis.width(400).height(400)
       .event("mousedown", pv.Behavior.pan())
       .event("mousewheel", pv.Behavior.zoom());

    // Load our data
    protovisData = self.dataForProtovis();
    network.nodes(protovisData.nodes).links(protovisData.links);

    colors = pv.Colors.category19();

    network.link.add(pv.Line)
                .strokeStyle("#999")
                .lineWidth(2)
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
                .shape("square")
                .fillStyle("#999")
                .size(function(n, l) { return self._nodeWeightFunc(l.targetNode.weight, this.scale); } ); 
                
    network.node.add(pv.Dot)
                .size(function(d) self._nodeWeightFunc(d.weight, this.scale))
                .fillStyle(function(d) d.fix ? "brown" : colors(d.group))
                .strokeStyle(function() this.fillStyle().darker())
                .lineWidth(1)
                .title(function(d) d.nodeName)
                .event("mousedown", pv.Behavior.drag())
                .event("drag", network);

    vis.render();
};

