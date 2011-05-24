/*
 * RRD graphing libraries, based on Flot
 * Part of the javascriptRRD package
 * Copyright (c) 2010 Frank Wuerthwein, fkw@ucsd.edu
 *                    Igor Sfiligoi, isfiligoi@ucsd.edu
 *
 * Original repository: http://javascriptrrd.sourceforge.net/
 * 
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 *
 */

/*
 *
 * Flot is a javascript plotting library developed and maintained by
 * Ole Laursen [http://code.google.com/p/flot/]
 *
 */

/*
 * Local dependencies:
 *  rrdFlotSupport.py
 *
 * External dependencies:
 *  [Flot]/jquery.py
 *  [Flot]/jquery.flot.js
 *  [Flot]/jquery.flot.selection.js
 */

/* graph_options defaults (see Flot docs for details)
 * {
 *  legend: { position:"nw",noColumns:3},
 *  lines: { show:true },
 *  yaxis: { autoscaleMargin: 0.20}
 * }
 *
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
 *
 * //overwrites other defaults; mostly used for linking via the URL
 * rrdflot_defaults defaults (see Flot docs for details) 	 
 * { 	 
 *     legend: "Top"         //Starting location of legend. Options are: 	 
 *                           //"Top","Bottom","TopRight","BottomRight","None". 	 
 *     num_cb_rows: 12       //How many rows of DS checkboxes per column. 	 
 *     multi_ds: false       //"true" appends the name of the aggregation function to the 	 
 *                           //name of the DS element. Useful for when an element is displayed 	 
 *                           //more than once but under different aggregation functions. 	 
 *     use_checked_DSs: true //boolean to use checked_DSs below (which override all other checking procedure)
 *     checked_DSs: []       //array of DSs names to be plotted (so that they can be specified via URL link.)
 *     use_rra: true         //use the rra below
 *     specified_rra: idx    //index (int) of rra to be plotted
 * }
 */

var local_checked_DSs = [];
var selected_rra = 0;
var window_min=0;
var window_max=0;

function rrdFlot(html_id, rrd_file, graph_options, ds_graph_options, rrdflot_defaults) {
  this.html_id=html_id;
  this.rrd_file=rrd_file;
  this.graph_options=graph_options;
  if (rrdflot_defaults==null) {
    this.rrdflot_defaults=new Object(); // empty object, just not to be null
  } else {
    this.rrdflot_defaults=rrdflot_defaults;
  }
  if (ds_graph_options==null) {
    this.ds_graph_options=new Object(); // empty object, just not to be null
  } else {
    this.ds_graph_options=ds_graph_options;
  }
  this.selection_range=new rrdFlotSelection();

  graph_info={};
  this.createHTML();
  this.populateRes();
  this.populateDScb();
  this.drawFlotGraph()
}


// ===============================================
// Create the HTML tags needed to host the graphs
rrdFlot.prototype.createHTML = function() {
  var rf_this=this; // use obj inside other functions

  var base_el=document.getElementById(this.html_id);

  this.res_id=this.html_id+"_res";
  this.ds_cb_id=this.html_id+"_ds_cb";
  this.graph_id=this.html_id+"_graph";
  this.scale_id=this.html_id+"_scale";
  this.legend_sel_id=this.html_id+"_legend_sel";

  // First clean up anything in the element
  while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);

  // Now create the layout
  var external_table=document.createElement("Table");

  // Header two: resulution select and DS selection title
  var rowHeader=external_table.insertRow(-1);
  var cellRes=rowHeader.insertCell(-1);
  cellRes.colSpan=3;
  cellRes.appendChild(document.createTextNode("Resolution:"));
  var forRes=document.createElement("Select");
  forRes.id=this.res_id;
  //forRes.onChange= this.callback_res_changed;
  forRes.onchange= function () {rf_this.callback_res_changed();};
  cellRes.appendChild(forRes);

  var cellDSTitle=rowHeader.insertCell(-1);
  cellDSTitle.appendChild(document.createTextNode("Select elements to plot:"));

  // Graph row: main graph and DS selection block
  var rowGraph=external_table.insertRow(-1);
  var cellGraph=rowGraph.insertCell(-1);
  cellGraph.colSpan=3;
  var elGraph=document.createElement("Div");
  elGraph.style.width="500px";
  elGraph.style.height="300px";
  elGraph.id=this.graph_id;
  cellGraph.appendChild(elGraph);

  var cellDScb=rowGraph.insertCell(-1);
  

  cellDScb.vAlign="top";
  var formDScb=document.createElement("Form");
  formDScb.id=this.ds_cb_id;
  formDScb.onchange= function () {rf_this.callback_ds_cb_changed();};
  cellDScb.appendChild(formDScb);

  // Scale row: scaled down selection graph
  var rowScale=external_table.insertRow(-1);

  var cellScaleLegend=rowScale.insertCell(-1);
  cellScaleLegend.vAlign="top";
  cellScaleLegend.appendChild(document.createTextNode("Legend:"));
  cellScaleLegend.appendChild(document.createElement('br'));
  var forScaleLegend=document.createElement("Select");
  forScaleLegend.id=this.legend_sel_id;
  forScaleLegend.appendChild(new Option("Top","nw",this.rrdflot_defaults.legend=="Top"));
  forScaleLegend.appendChild(new Option("Bottom","sw",this.rrdflot_defaults.legend=="Bottom"));
  forScaleLegend.appendChild(new Option("TopRight","ne",this.rrdflot_defaults.legend=="TopRight"));
  forScaleLegend.appendChild(new Option("BottomRight","se",this.rrdflot_defaults.legend=="BottomRight"));
  forScaleLegend.appendChild(new Option("None","None",this.rrdflot_defaults.legend=="None"));
  forScaleLegend.onchange= function () {rf_this.callback_legend_changed();};
  cellScaleLegend.appendChild(forScaleLegend);

  var cellScale=rowScale.insertCell(-1);
  cellScale.align="right";
  var elScale=document.createElement("Div");
  elScale.style.width="250px";
  elScale.style.height="110px";
  elScale.id=this.scale_id;
  cellScale.appendChild(elScale);
  
  var cellScaleReset=rowScale.insertCell(-1);
  cellScaleReset.vAlign="top";
  cellScaleReset.appendChild(document.createTextNode(" "));
  cellScaleReset.appendChild(document.createElement('br'));
  var elScaleReset=document.createElement("input");
  elScaleReset.type = "button";
  elScaleReset.value = "Reset selection";
  elScaleReset.onclick = function () {rf_this.callback_scale_reset();}

  cellScaleReset.appendChild(elScaleReset);

  base_el.appendChild(external_table);
};

// ======================================
// Populate RRA and RD info
rrdFlot.prototype.populateRes = function() {
  var form_el=document.getElementById(this.res_id);

  // First clean up anything in the element
  while (form_el.lastChild!=null) form_el.removeChild(form_el.lastChild);

  // now populate with RRA info
  var nrRRAs=this.rrd_file.getNrRRAs();
  for (var i=0; i<nrRRAs; i++) {

    var rra=this.rrd_file.getRRAInfo(i);
    var step=rra.getStep();
    var rows=rra.getNrRows();
    var period=step*rows;
    var rra_label=rfs_format_time(step)+" ("+rfs_format_time(period)+" total)";
    form_el.appendChild(new Option(rra_label,i));
  }
    if(this.rrdflot_defaults.use_rra) {form_el.selectedIndex = this.rrdflot_defaults.rra;}
};

rrdFlot.prototype.populateDScb = function() {
  var form_el=document.getElementById(this.ds_cb_id);
 
  //Create a table within a table to arrange
  // checkbuttons into two or more columns
  var table_el=document.createElement("Table");
  var row_el=table_el.insertRow(-1);
  row_el.vAlign="top";
  var cell_el=null; // will define later

  if (this.rrdflot_defaults.num_cb_rows==null) {
     this.rrdflot_defaults.num_cb_rows=12; 
  }
  // now populate with DS info
  var nrDSs=this.rrd_file.getNrDSs();
  for (var i=0; i<nrDSs; i++) {
    if ((i%this.rrdflot_defaults.num_cb_rows)==0) { // one column every x DSs
      cell_el=row_el.insertCell(-1);
    }
    var ds=this.rrd_file.getDS(i);
    if (this.rrdflot_defaults.multi_ds) { //null==false in boolean ops
       var name=ds.getName()+"-"+ds.getType();
       var name2=ds.getName();
    }
    else {var name=ds.getName(); var name2=ds.getName();}
    var title=name; 
    if(this.rrdflot_defaults.use_checked_DSs) {
       if(this.rrdflot_defaults.checked_DSs.length==0) {
          var checked=(i==0); // only first checked by default
       } else{checked=false;}
    } else {var checked=(i==0);}
    if (this.ds_graph_options[name]!=null) {
      var dgo=this.ds_graph_options[name];
      if (dgo['title']!=null) {
	// if the user provided the title, use it
	title=dgo['title'];
      } else if (dgo['label']!=null) {
	// use label as a second choiceit
	title=dgo['label'];
      } // else leave the ds name
      if(this.rrdflot_defaults.use_checked_DSs) {
         if(this.rrdflot_defaults.checked_DSs.length==0) {
           // if the user provided the title, use it
           checked=dgo['checked'];
         }
      } else {
         if (dgo['checked']!=null) {
            checked=dgo['checked']; 
         }
      }
    }
    if(this.rrdflot_defaults.use_checked_DSs) {
       if(this.rrdflot_defaults.checked_DSs==null) {continue;}
       for(var j=0;j<this.rrdflot_defaults.checked_DSs.length;j++){
             if (name==this.rrdflot_defaults.checked_DSs[j]) {checked=true;}
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

// ======================================
// 
rrdFlot.prototype.drawFlotGraph = function() {
  // Res contains the RRA idx
  var oSelect=document.getElementById(this.res_id);
  var rra_idx=Number(oSelect.options[oSelect.selectedIndex].value);
  selected_rra=rra_idx;
  if(this.rrdflot_defaults.use_rra) {
    oSelect.options[oSelect.selectedIndex].value = this.rrdflot_defaults.rra;
    rra_idx = this.rrdflot_defaults.rra;
  }
  // now get the list of selected DSs
  var ds_positive_stack_list=[];
  var ds_negative_stack_list=[];
  var ds_single_list=[];
  var ds_colors={};
  var oCB=document.getElementById(this.ds_cb_id);
  var nrDSs=oCB.ds.length;
  local_checked_DSs=[];
  if (oCB.ds.length>0) {
    for (var i=0; i<oCB.ds.length; i++) {
      if (oCB.ds[i].checked==true) {
	var ds_name=oCB.ds[i].value;
	var ds_stack_type='none';
        local_checked_DSs.push(ds_name);;
	if (this.ds_graph_options[ds_name]!=null) {
	  var dgo=this.ds_graph_options[ds_name];
	  if (dgo['stack']!=null) {
	    var ds_stack_type=dgo['stack'];
	  }
	}
	if (ds_stack_type=='positive') {
	  ds_positive_stack_list.push(ds_name);
	} else if (ds_stack_type=='negative') {
	  ds_negative_stack_list.push(ds_name);
	} else {
	  ds_single_list.push(ds_name);
	}
	ds_colors[ds_name]=i;
      }
    }
  } else { // single element is not treated as an array
    if (oCB.ds.checked==true) {
      // no sense trying to stack a single element
      var ds_name=oCB.ds.value;
      ds_single_list.push(ds_name);
      ds_colors[ds_name]=0;
      local_checked_DSs.push(ds_name);
    }
  }
  
  // then extract RRA data about those DSs
  var flot_obj=rrdRRAStackFlotObj(this.rrd_file,rra_idx,
				  ds_positive_stack_list,ds_negative_stack_list,ds_single_list);

  // fix the colors, based on the position in the RRD
  for (var i=0; i<flot_obj.data.length; i++) {
    var name=flot_obj.data[i].label; // at this point, label is the ds_name
    var color=ds_colors[name]; // default color as defined above
    if (this.ds_graph_options[name]!=null) {
      var dgo=this.ds_graph_options[name];
      if (dgo['color']!=null) {
	color=dgo['color'];
      }
      if (dgo['label']!=null) {
	// if the user provided the label, use it
	flot_obj.data[i].label=dgo['label'];
      } else  if (dgo['title']!=null) {
	// use title as a second choice 
	flot_obj.data[i].label=dgo['title'];
      } // else use the ds name
      if (dgo['lines']!=null) {
	// if the user provided the label, use it
	flot_obj.data[i].lines=dgo['lines'];
      }
      if (dgo['yaxis']!=null) {
	// if the user provided the label, use it
	flot_obj.data[i].yaxis=dgo['yaxis'];
      }
    }
    flot_obj.data[i].color=color;
  }

  // finally do the real plotting
  this.bindFlotGraph(flot_obj);
};

// ======================================
// Bind the graphs to the HTML tags
rrdFlot.prototype.bindFlotGraph = function(flot_obj) {
  var rf_this=this; // use obj inside other functions

  // Legend
  var oSelect=document.getElementById(this.legend_sel_id);
  var legend_id=oSelect.options[oSelect.selectedIndex].value;

  var graph_jq_id="#"+this.graph_id;
  var scale_jq_id="#"+this.scale_id;

  var graph_options = {
    legend: {show:false, position:"nw",noColumns:3},
    lines: {show:true},
    xaxis: { mode: "time" },
    yaxis: { autoscaleMargin: 0.20},
    selection: { mode: "x" },
  };

  if (legend_id=="None") {
    // do nothing
  } else {
    graph_options.legend.show=true;
    graph_options.legend.position=legend_id;
  }

  if (this.selection_range.isSet()) {
    var selection_range=this.selection_range.getFlotRanges();
    if(this.rrdflot_defaults.use_windows) {
       graph_options.xaxis.min = this.rrdflot_defaults.window_min;  
       graph_options.xaxis.max = this.rrdflot_defaults.window_max;  
    } else {
    graph_options.xaxis.min=selection_range.xaxis.from;
    graph_options.xaxis.max=selection_range.xaxis.to;
    }
  } else if(this.rrdflot_defaults.use_windows) {
    graph_options.xaxis.min = this.rrdflot_defaults.window_min;  
    graph_options.xaxis.max = this.rrdflot_defaults.window_max;  
  } else {
    graph_options.xaxis.min=flot_obj.min;
    graph_options.xaxis.max=flot_obj.max;
  }

  if (this.graph_options!=null) {
    if (this.graph_options.legend!=null) {
      if (this.graph_options.legend.position!=null) {
	graph_options.legend.position=this.graph_options.legend.position;
      }
      if (this.graph_options.legend.noColumns!=null) {
	gcale_data=flot_data;
      }
    }
    if (this.graph_options.yaxis!=null) {
      if (this.graph_options.yaxis.autoscaleMargin!=null) {
	graph_options.yaxis.autoscaleMargin=this.graph_options.yaxis.autoscaleMargin;
      }
    }
    if (this.graph_options.lines!=null) {
      graph_options.lines=this.graph_options.lines;
    }
  }

  var scale_options = {
    legend: {show:false},
    lines: {show:true},
    xaxis: {mode: "time", min:flot_obj.min, max:flot_obj.max },
    selection: { mode: "x" },
  };
  var linked_scale_options = {
    legend: {show:false},
    lines: {show:true},
    xaxis: {mode: "time", min:this.rrdflot_defaults.window_min, max: this.rrdflot_defaults.window_max },
    selection: { mode: "x" },
  }; 

  var flot_data=flot_obj.data;
  //document.write(flot_data);

  var graph_data=this.selection_range.trim_flot_data(flot_data);
  var scale_data=flot_data;

  this.graph = $.plot($(graph_jq_id), graph_data, graph_options);
  this.scale = $.plot($(scale_jq_id), scale_data, scale_options);
 
  
  if(this.rrdflot_defaults.use_windows) {
    ranges = {};
    ranges.xaxis = [];
    ranges.xaxis.from = this.rrdflot_defaults.window_min;
    ranges.xaxis.to = this.rrdflot_defaults.window_max;
    rf_this.scale.setSelection(ranges,true);
    window_min = ranges.xaxis.from;
    window_max = ranges.xaxis.to;
  } else {
    window_min=0;
    window_max=0;
    }

  if (this.selection_range.isSet()) {
    this.scale.setSelection(this.selection_range.getFlotRanges(),true); //don't fire event, no need
  }

  // now connect the two    
  $(graph_jq_id).unbind("plotselected"); // but first remove old function
  $(graph_jq_id).bind("plotselected", function (event, ranges) {
      // do the zooming
      rf_this.selection_range.setFromFlotRanges(ranges);
      graph_options.xaxis.min=ranges.xaxis.from;
      graph_options.xaxis.max=ranges.xaxis.to;
      window_min = ranges.xaxis.from;
      window_max = ranges.xaxis.to;
      rf_this.graph = $.plot($(graph_jq_id), rf_this.selection_range.trim_flot_data(flot_data), graph_options);
      
      // don't fire event on the scale to prevent eternal loop
      rf_this.scale.setSelection(ranges, true); //puts the transparent window on minigraph
  });
   
  $(scale_jq_id).unbind("plotselected"); //same here 
  $(scale_jq_id).bind("plotselected", function (event, ranges) {
      rf_this.graph.setSelection(ranges);
  });

  // only the scale has a selection
  // so when that is cleared, redraw also the graph
  $(scale_jq_id).bind("plotunselected", function() {
      rf_this.selection_range.reset();
      graph_options.xaxis.min=flot_obj.min;
      graph_options.xaxis.max=flot_obj.max;
      rf_this.graph = $.plot($(graph_jq_id), rf_this.selection_range.trim_flot_data(flot_data), graph_options);
      window_min = 0;
      window_max = 0;
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

function getGraphInfo() {
   var graph_info = {};
   graph_info['dss'] = local_checked_DSs;
   graph_info['rra'] = selected_rra;
   graph_info['window_min'] = window_min;
   graph_info['window_max'] = window_max;
   return graph_info;
}

function resetWindow() {
  window_min = 0;
  window_max = 0; 

}
