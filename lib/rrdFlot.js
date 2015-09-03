/**
 * @param html_id ID of a HTML element, possibly a div.
 * @param rrd_file An object of type RRDFile, or equivalent.
 * @param graph_options Global graphing options. See Flot documentation and tooltip plugin documentation for more details.
 * @param ds_graph_options Dictionary of graphing options. This must be a dictionary of DS_id. Each element of the dictionary contains graphing options. See Flot documentation for more details.
 * @param Dictionary of rrd_flot options. All are optional.
 * @constructor
 */
function rrdFlot(html_id, rrd_file, graph_options, ds_graph_options, rrdflot_defaults) {
	this.html_id = html_id;
	this.rrd_file = rrd_file;
	/*
	 * TODO: make proper defaults like rrdflot_defaults
	 * {
	 *  legend: { position:"nw",noColumns:3},
	 *  lines: { show:true },
	 *  yaxis: { autoscaleMargin: 0.20},
	 *  tooltip: true,
	 *  tooltipOpts: { content: "<h4>%s</h4> Value: %y.3" }
	 * }
	 */
	this.graph_options = graph_options;


	// FIXME namespace does not show the default values :(
	/**
	 * @namespace
	 */
	this.rrdflot_defaults = {
		/** if true, limit the display to the graph only */
		graph_only: false,
		/** Starting location of legend. Options are: "Top","Bottom","TopRight","BottomRight","None". */
		legend: "Top",
		/** How many rows of DS checkboxes per column. */
		num_cb_rows: 12,
		/** To be used in conjunction with num_cb_rows: This option creates a button above every column, which selects every element in the column. */
		use_element_buttons: false,
		/** "true" appends the name of the aggregation function to the name of the DS element. */
		multi_ds: false,
		/** "true" appends the name of the RRA consolidation function (CF) (AVERAGE, MIN, MAX or LAST) to the name of the RRA. Useful for RRAs over the same interval with different CFs. */
		multi_rra: false,
		/** Use the list checked_DSs below. */
		use_checked_DSs: false,
		/** List of elements to be checked by default when graph is loaded. Overwrites graph options.*/
		checked_DSs: [],
		/** Whether to use the rra index specified below. */
		use_rra: false,
		/** RRA (rra index in rrd) to be selected when graph is loaded. */
		rra: 0,
		/** Whether to use the window zoom specifications below. */
		use_windows: false,
		/** Sets minimum for window zoom. X-axis usually in unix time. */
		window_min: 0,
		/** Sets maximum for window zoom. */
		window_max: 0,
		/** Height of main graph. */
		graph_height: "300px",
		/** Width of main graph. */
		graph_width: "500px",
		/** Height of small scaler graph. */
		scale_height: "110px",
		/** Width of small scaler graph. */
		scale_width: "250px",
		/** Timezone to plot. Options are -11 through +12 */
		timezone: -Math.ceil((new Date()).getTimezoneOffset() / 60)
	};

	// user supplied defaults override the system defaults
	if (rrdflot_defaults !== null && rrdflot_defaults !== undefined) {
		this.rrdflot_defaults = $.extend({}, this.rrdflot_defaults, rrdflot_defaults);
	}

	/*
	 * TODO: make proper defaults like rrdflot_defaults
	 * ds_graph_options is a dictionary of DS_name, 
	 *   with each element being a graph_option
	 *   The defaults for each element are
	 *   {
	 *     title: label  or ds_name     // this is what is displayed in the checkboxes
	 *     checked: first_ds_in_list?   // boolean
	 *     label: title or ds_name      // this is what is displayed in the legend
	 *     color: ds_index              // see Flot docs for details
	 *     lines: { show:true }         // see Flot docs for details
	 *     yaxis: 1                     // can be 1 or 2
	 *     stack: 'none'                // other options are 'positive' and 'negative'
	 *   }
	 */

	if (ds_graph_options === null || ds_graph_options === undefined) {
		this.ds_graph_options = {}; // empty object, just not to be null
	} else {
		this.ds_graph_options = ds_graph_options;
	}
	this.selection_range = new rrdFlotSelection();

	graph_info = {};
	this.createHTML();
	this.populateRes();
	this.populateDScb();
	this.drawFlotGraph();

	if (this.rrdflot_defaults.graph_only === true) {
		this.cleanHTMLCruft();
	}
}


// ===============================================
// Create the HTML tags needed to host the graphs
rrdFlot.prototype.createHTML = function() {
	var rf_this = this; // use obj inside other functions

	var base_el = document.getElementById(this.html_id);

	this.res_id = this.html_id + "_res";
	this.ds_cb_id = this.html_id + "_ds_cb";
	this.graph_id = this.html_id + "_graph";
	this.scale_id = this.html_id + "_scale";
	this.legend_sel_id = this.html_id + "_legend_sel";
	this.time_sel_id = this.html_id + "_time_sel";
	this.elem_group_id = this.html_id + "_elem_group";

	// First clean up anything in the element
	while (base_el.lastChild !== null) base_el.removeChild(base_el.lastChild);

	// Now create the layout
	var external_table = document.createElement("table");
	this.external_table = external_table;

	// Header two: resulution select and DS selection title
	var rowHeader = external_table.insertRow(-1);
	var cellRes = rowHeader.insertCell(-1);
	cellRes.colSpan = 3;
	cellRes.appendChild(document.createTextNode("Resolution:"));
	var forRes = document.createElement("select");
	forRes.id = this.res_id;
	forRes.onchange = function() {
		rf_this.callback_res_changed();
	};
	cellRes.appendChild(forRes);

	var cellDSTitle = rowHeader.insertCell(-1);
	cellDSTitle.appendChild(document.createTextNode("Select elements to plot:"));

	// Graph row: main graph and DS selection block
	var rowGraph = external_table.insertRow(-1);
	var cellGraph = rowGraph.insertCell(-1);
	cellGraph.colSpan = 3;
	var elGraph = document.createElement("div");
	elGraph.style.width = this.rrdflot_defaults.graph_width;
	elGraph.style.height = this.rrdflot_defaults.graph_height;
	elGraph.id = this.graph_id;
	cellGraph.appendChild(elGraph);

	var cellDScb = rowGraph.insertCell(-1);
	rowGraph.appendChild(cellDScb);
	cellDScb.vAlign = "top";
	var formDScb = document.createElement("form");
	formDScb.id = this.ds_cb_id;
	formDScb.onchange = function() {
		rf_this.callback_ds_cb_changed();
	};
	cellDScb.appendChild(formDScb);

	// Scale row: scaled down selection graph
	var rowScale = external_table.insertRow(-1);

	var cellScaleLegend = rowScale.insertCell(-1);
	cellScaleLegend.vAlign = "top";
	cellScaleLegend.appendChild(document.createTextNode("Legend:"));
	cellScaleLegend.appendChild(document.createElement('br'));

	var forScaleLegend = document.createElement("select");
	forScaleLegend.id = this.legend_sel_id;
	forScaleLegend.appendChild(new Option("Top", "nw", this.rrdflot_defaults.legend == "Top", this.rrdflot_defaults.legend == "Top"));
	forScaleLegend.appendChild(new Option("Bottom", "sw", this.rrdflot_defaults.legend == "Bottom", this.rrdflot_defaults.legend == "Bottom"));
	forScaleLegend.appendChild(new Option("TopRight", "ne", this.rrdflot_defaults.legend == "TopRight", this.rrdflot_defaults.legend == "TopRight"));
	forScaleLegend.appendChild(new Option("BottomRight", "se", this.rrdflot_defaults.legend == "BottomRight", this.rrdflot_defaults.legend == "BottomRight"));
	forScaleLegend.appendChild(new Option("None", "None", this.rrdflot_defaults.legend == "None", this.rrdflot_defaults.legend == "None"));
	forScaleLegend.onchange = function() {
		rf_this.callback_legend_changed();
	};
	cellScaleLegend.appendChild(forScaleLegend);


	cellScaleLegend.appendChild(document.createElement('br'));
	cellScaleLegend.appendChild(document.createTextNode("Timezone:"));
	cellScaleLegend.appendChild(document.createElement('br'));

	var timezone = document.createElement("select");
	timezone.id = this.time_sel_id;

	var true_tz = Math.ceil(this.rrdflot_defaults.timezone);

	for (var j = -12; j < 12; j++) {
		timezone.appendChild(new Option(j, j, true_tz == j, true_tz == j));
	}
	timezone.onchange = function() {
		rf_this.callback_timezone_changed();
	};

	cellScaleLegend.appendChild(timezone);

	var cellScale = rowScale.insertCell(-1);
	cellScale.align = "right";
	var elScale = document.createElement("div");
	elScale.style.width = this.rrdflot_defaults.scale_width;
	elScale.style.height = this.rrdflot_defaults.scale_height;
	elScale.id = this.scale_id;
	cellScale.appendChild(elScale);

	var cellScaleReset = rowScale.insertCell(-1);
	cellScaleReset.vAlign = "top";
	cellScaleReset.appendChild(document.createTextNode(" "));
	cellScaleReset.appendChild(document.createElement('br'));
	var elScaleReset = document.createElement("input");
	elScaleReset.type = "button";
	elScaleReset.value = "Reset selection";
	elScaleReset.onclick = function() {
		rf_this.callback_scale_reset();
	};

	cellScaleReset.appendChild(elScaleReset);

	base_el.appendChild(external_table);
};

// ===============================================
// Remove all HTMl elements but the graph
rrdFlot.prototype.cleanHTMLCruft = function() {
	var rf_this = this; // use obj inside other functions

	// delete top and bottom rows... graph is in the middle
	this.external_table.deleteRow(-1);
	this.external_table.deleteRow(0);

	var ds_el = document.getElementById(this.ds_cb_id);
	ds_el.removeChild(ds_el.lastChild);
};

// ======================================
// Populate RRA and RD info
rrdFlot.prototype.populateRes = function() {
	var form_el = document.getElementById(this.res_id);

	// First clean up anything in the element
	while (form_el.lastChild !== null) form_el.removeChild(form_el.lastChild);

	// now populate with RRA info
	var nrRRAs = this.rrd_file.getNrRRAs();
	for (var i = 0; i < nrRRAs; i++) {
		var rra = this.rrd_file.getRRAInfo(i);
		var step = rra.getStep();
		var rows = rra.getNrRows();
		var period = step * rows;
		var rra_label = rfs_format_time(step) + " (" + rfs_format_time(period) + " total)";
		if (this.rrdflot_defaults.multi_rra) rra_label += " " + rra.getCFName();
		form_el.appendChild(new Option(rra_label, i));
	}
	if (this.rrdflot_defaults.use_rra) {
		form_el.selectedIndex = this.rrdflot_defaults.rra;
	}
};

rrdFlot.prototype.populateDScb = function() {
	var rf_this = this; // use obj inside other functions
	var form_el = document.getElementById(this.ds_cb_id);

	//Create a table within a table to arrange
	// checkbuttons into two or more columns
	var table_el = document.createElement("table");
	var row_el = table_el.insertRow(-1);
	row_el.vAlign = "top";
	var cell_el = null; // will define later

	// now populate with DS info
	var nrDSs = this.rrd_file.getNrDSs();
	var elem_group_number = 0;

	var elGroupSelectonclick = (function(e) { //lambda function!!
		return function() {
			rf_this.callback_elem_group_changed(e);
		};
	});

	for (var i = 0; i < nrDSs; i++) {

		if (Math.round(i % this.rrdflot_defaults.num_cb_rows) === 0) { // one column every x DSs
			if (this.rrdflot_defaults.use_element_buttons) {
				cell_el = row_el.insertCell(-1); //make next element column 
				if (nrDSs > this.rrdflot_defaults.num_cb_rows) { //if only one column, no need for a button
					elem_group_number = (i / this.rrdflot_defaults.num_cb_rows) + 1;
					var elGroupSelect = document.createElement("input");
					elGroupSelect.type = "button";
					elGroupSelect.value = "Group " + elem_group_number;
					elGroupSelect.onclick = elGroupSelectonclick(elem_group_number);

					cell_el.appendChild(elGroupSelect);
					cell_el.appendChild(document.createElement('br')); //add space between the two
				}
			} else {
				//just make next element column
				cell_el = row_el.insertCell(-1);
			}
		}
		var ds = this.rrd_file.getDS(i);
		var name2 = ds.getName();
		var name = ds.getName();
		if (this.rrdflot_defaults.multi_ds) {
			name = name + "-" + ds.getType();
		}
		var title = name;

		// by default, if we have ony one ds check it, otherwise nothing is selected
		var checked = (i === 0);
		if (this.rrdflot_defaults.use_checked_DSs && this.rrdflot_defaults.checked_DSs.length !== 0) {
			checked = false;
		}

		var dgo;
		if (this.ds_graph_options[name] !== undefined) {
			dgo = this.ds_graph_options[name];
			if (dgo.title !== undefined) {
				// if the user provided the title, use it
				title = dgo.title;
			} else if (dgo.label !== undefined) {
				// use label as a second choiceit
				title = dgo.label;
			} // else leave the ds name
			if (this.rrdflot_defaults.use_checked_DSs) {
				if (this.rrdflot_defaults.checked_DSs.length === 0) {
					// if the user provided the title, use it
					checked = dgo.checked;
				}
			} else {
				if (dgo.checked !== undefined) {
					checked = dgo.checked;
				}
			}
		}
		if (this.rrdflot_defaults.use_checked_DSs) {
			if (this.rrdflot_defaults.checked_DSs === undefined) {
				continue;
			}
			for (var j = 0; j < this.rrdflot_defaults.checked_DSs.length; j++) {
				if (name == this.rrdflot_defaults.checked_DSs[j]) {
					checked = true;
				}
			}
		}
		var cb_el = document.createElement("input");
		cb_el.type = "checkbox";
		cb_el.name = "ds";
		cb_el.value = name2;
		cb_el.checked = cb_el.defaultChecked = checked;
		cell_el.appendChild(cb_el);
		cell_el.appendChild(document.createTextNode(title));
		cell_el.appendChild(document.createElement('br'));
	}
	form_el.appendChild(table_el);
};

rrdFlot.prototype.drawFlotGraph = function() {
	// Res contains the RRA idx
	var oSelect = document.getElementById(this.res_id);
	var rra_idx = Number(oSelect.options[oSelect.selectedIndex].value);
	if (this.rrdflot_defaults.use_rra) {
		oSelect.options[oSelect.selectedIndex].value = this.rrdflot_defaults.rra;
		rra_idx = this.rrdflot_defaults.rra;
	}

	// now get the list of selected DSs
	var ds_positive_stack_list = [];
	var ds_negative_stack_list = [];
	var ds_single_list = [];
	var ds_colors = {};
	var oCB = document.getElementById(this.ds_cb_id);
	var nrDSs = oCB.ds.length;
	var i; // iterator variable FIXME

	if (oCB.ds.length > 0) {
		for (i = 0; i < oCB.ds.length; i++) {
			if (oCB.ds[i].checked === true) {
				var ds_name = oCB.ds[i].value;
				var ds_stack_type = 'none';
				if (this.ds_graph_options[ds_name] !== undefined) {
					if (this.ds_graph_options[ds_name].stack !== undefined) {
						ds_stack_type = this.ds_graph_options[ds_name].stack;
					}
				}
				if (ds_stack_type == 'positive') {
					ds_positive_stack_list.push(ds_name);
				} else if (ds_stack_type == 'negative') {
					ds_negative_stack_list.push(ds_name);
				} else {
					ds_single_list.push(ds_name);
				}
				ds_colors[ds_name] = i;
			}
		}
	} else { // single element is not treated as an array
		if (oCB.ds.checked === true) {
			// no sense trying to stack a single element
			ds_single_list.push(oCB.ds.value);
			ds_colors[oCB.ds.value] = 0;
		}
	}

	var timeSelect = document.getElementById(this.time_sel_id);
	var timezone_shift = timeSelect.options[timeSelect.selectedIndex].value;

	// then extract RRA data about those DSs
	var flot_obj = rrdRRAStackFlotObj(this.rrd_file, rra_idx,
		ds_positive_stack_list, ds_negative_stack_list, ds_single_list,
		timezone_shift * 3600);

	// fix the colors, based on the position in the RRD
	for (i = 0; i < flot_obj.data.length; i++) {
		var name = flot_obj.data[i].label;
		var color = ds_colors[name]; // default color as defined above
		if (this.ds_graph_options[name] !== undefined) {
			var dgo = this.ds_graph_options[name];
			if (dgo.color !== undefined) {
				color = dgo.color;
			}
			if (dgo.label !== undefined) {
				// if the user provided the label, use it
				flot_obj.data[i].label = dgo.label;
			} else if (dgo.title !== undefined) {
				// use title as a second choice 
				flot_obj.data[i].label = dgo.title;
			}
			if (dgo.lines !== undefined) {
				// if the user provided the label, use it
				flot_obj.data[i].lines = dgo.lines;
			}
			if (dgo.yaxis !== undefined) {
				// if the user provided the label, use it
				flot_obj.data[i].yaxis = dgo.yaxis;
			}
		}
		flot_obj.data[i].color = color;
	}

	// finally do the real plotting
	this.bindFlotGraph(flot_obj);
};

// ======================================
// Bind the graphs to the HTML tags
rrdFlot.prototype.bindFlotGraph = function(flot_obj) {
	var rf_this = this; // use obj inside other functions

	// Legend
	var oSelect = document.getElementById(this.legend_sel_id);
	var legend_id = oSelect.options[oSelect.selectedIndex].value;
	var graph_jq_id = "#" + this.graph_id;
	var scale_jq_id = "#" + this.scale_id;

	var graph_options = {
		legend: {
			show: false,
			position: "nw",
			noColumns: 3
		},
		lines: {
			show: true
		},
		xaxis: {
			mode: "time"
		},
		yaxis: {
			autoscaleMargin: 0.20
		},
		selection: {
			mode: "x"
		},
		tooltip: true,
		tooltipOpts: {
			content: "<h4>%s</h4> Value: %y.3"
		},
		grid: {
			hoverable: true
		},
	};

	if (legend_id == "None") {
		// do nothing
	} else {
		graph_options.legend.show = true;
		graph_options.legend.position = legend_id;
	}

	if (this.graph_options !== undefined) {
		graph_options = populateGraphOptions(graph_options, this.graph_options);
	}

	if (graph_options.tooltip === false) {
		// avoid the need for the caller specify both
		graph_options.grid.hoverable = false;
	}

	if (this.selection_range.isSet()) {
		var selection_range = this.selection_range.getFlotRanges();
		if (this.rrdflot_defaults.use_windows) {
			graph_options.xaxis.min = this.rrdflot_defaults.window_min;
			graph_options.xaxis.max = this.rrdflot_defaults.window_max;
		} else {
			graph_options.xaxis.min = selection_range.xaxis.from;
			graph_options.xaxis.max = selection_range.xaxis.to;
		}
	} else if (this.rrdflot_defaults.use_windows) {
		graph_options.xaxis.min = this.rrdflot_defaults.window_min;
		graph_options.xaxis.max = this.rrdflot_defaults.window_max;
	} else {
		graph_options.xaxis.min = flot_obj.min;
		graph_options.xaxis.max = flot_obj.max;
	}

	var scale_options = {
		legend: {
			show: false
		},
		lines: {
			show: true
		},
		xaxis: {
			mode: "time",
			min: flot_obj.min,
			max: flot_obj.max
		},
		yaxis: graph_options.yaxis,
		selection: {
			mode: "x"
		},
	};

	var flot_data = flot_obj.data;
	var graph_data = this.selection_range.trim_flot_data(flot_data);
	var scale_data = flot_data;

	this.graph = $.plot($(graph_jq_id), graph_data, graph_options);
	this.scale = $.plot($(scale_jq_id), scale_data, scale_options);

	if (this.rrdflot_defaults.use_windows) {
		ranges = {};
		ranges.xaxis = [];
		ranges.xaxis.from = this.rrdflot_defaults.window_min;
		ranges.xaxis.to = this.rrdflot_defaults.window_max;
		rf_this.scale.setSelection(ranges, true);
	}

	if (this.selection_range.isSet()) {
		this.scale.setSelection(this.selection_range.getFlotRanges(), true); //don't fire event, no need
	}

	// now connect the two    
	$(graph_jq_id).unbind("plotselected"); // but first remove old function
	$(graph_jq_id).bind("plotselected", function(event, ranges) {
		// do the zooming
		rf_this.selection_range.setFromFlotRanges(ranges);
		graph_options.xaxis.min = ranges.xaxis.from;
		graph_options.xaxis.max = ranges.xaxis.to;
		rf_this.graph = $.plot($(graph_jq_id), rf_this.selection_range.trim_flot_data(flot_data), graph_options);

		// don't fire event on the scale to prevent eternal loop
		rf_this.scale.setSelection(ranges, true); //puts the transparent window on minigraph
	});

	$(scale_jq_id).unbind("plotselected"); //same here 
	$(scale_jq_id).bind("plotselected", function(event, ranges) {
		rf_this.graph.setSelection(ranges);
	});

	// only the scale has a selection
	// so when that is cleared, redraw also the graph
	$(scale_jq_id).bind("plotunselected", function() {
		rf_this.selection_range.reset();
		graph_options.xaxis.min = flot_obj.min;
		graph_options.xaxis.max = flot_obj.max;
		rf_this.graph = $.plot($(graph_jq_id), rf_this.selection_range.trim_flot_data(flot_data), graph_options);
	});
};

// callback functions that are called when one of the selections changes
rrdFlot.prototype.callback_res_changed = function() {
	this.rrdflot_defaults.use_rra = false;
	this.drawFlotGraph();
};

rrdFlot.prototype.callback_ds_cb_changed = function() {
	this.drawFlotGraph();
};

rrdFlot.prototype.callback_scale_reset = function() {
	this.scale.clearSelection();
};

rrdFlot.prototype.callback_legend_changed = function() {
	this.drawFlotGraph();
};

rrdFlot.prototype.callback_timezone_changed = function() {
	this.drawFlotGraph();
};

rrdFlot.prototype.callback_elem_group_changed = function(num) {

	var oCB = document.getElementById(this.ds_cb_id);
	var nrDSs = oCB.ds.length;
	if (oCB.ds.length > 0) {
		for (var i = 0; i < oCB.ds.length; i++) {
			if (Math.floor(i / this.rrdflot_defaults.num_cb_rows) == num - 1) {
				oCB.ds[i].checked = true;
			} else {
				oCB.ds[i].checked = false;
			}
		}
	}
	this.drawFlotGraph();
};

function populateGraphOptions(me, other) {
	for (var e in other) {
		if (Object.prototype.toString.call(other[e]) == "[object Object]") {
			if (me[e] === undefined) {
				me[e] = {};
			}
			me[e] = populateGraphOptions(me[e], other[e]);
		} else {
			me[e] = other[e];
		}
	}
	return me;
}
