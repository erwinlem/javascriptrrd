/*
 * RRD graphing libraries, based on Flot
 * Part of the javascriptRRD package
 * Copyright (c) 2009 Frank Wuerthwein, fkw@ucsd.edu
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
 */

// ds_desciption and layout_opts not used yet
function rrdFlot(html_id, rrd_file, ds_description, layout_opts) {
  this.html_id=html_id;
  this.rrd_file=rrd_file;
  this.ds_description=ds_description;
  this.layout_ops=layout_opts;

  this.selection_range=new rrdFlotSelection();

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

  // First clean up anything in the element
  while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);

  // Now create the layout
  var external_table=document.createElement("Table");

  // Header rwo: resulution select and DS selection title
  var rowHeader=external_table.insertRow(-1);
  var cellRes=rowHeader.insertCell(-1);
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
  var cellScale=rowScale.insertCell(-1);
  var elScale=document.createElement("Div");
  elScale.style.width="400px";
  elScale.style.height="75px";
  elScale.id=this.scale_id;
  cellScale.appendChild(elScale);
  
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
    var rra_label=step+"s ("+period+"s total)";
    form_el.appendChild(new Option(rra_label,i));
  }
};

rrdFlot.prototype.populateDScb = function() {
  var form_el=document.getElementById(this.ds_cb_id);

  // First clean up anything in the element
  while (form_el.lastChild!=null) form_el.removeChild(form_el.lastChild);

  // now populate with DS info
  var nrDSs=this.rrd_file.getNrDSs();
  for (var i=0; i<nrDSs; i++) {
    var ds=this.rrd_file.getDS(i);
    var name=ds.getName();
    var cb_el = document.createElement("input");
    cb_el.type = "checkbox";
    cb_el.name = "ds";
    cb_el.value = name;
    cb_el.checked = cb_el.defaultChecked = true;
    form_el.appendChild(cb_el);
    form_el.appendChild(document.createTextNode(name));
    form_el.appendChild(document.createElement('br'));
  }
};

// ======================================
// 
rrdFlot.prototype.drawFlotGraph = function() {
  // Res contains the RRA idx
  var oSelect=document.getElementById(this.res_id);
  var rra_idx=Number(oSelect.options[oSelect.selectedIndex].value);

  // now get the list of selected DSs
  var ds_idxs=[];
  var oCB=document.getElementById(this.ds_cb_id);
  var nrDSs=oCB.ds.length;
  if (oCB.ds.length>0) {
    for (var i=0; i<oCB.ds.length; i++) {
      if (oCB.ds[i].checked==true) {
	ds_idxs.push(oCB.ds[i].value);
      }
    }
  } else { // single element is not treated as an array
    if (oCB.ds.checked==true) {
      ds_idxs.push(oCB.ds.value);
    }
  }
  
  // then extract RRA data about those DSs
  var flot_obj=rrdRRA2FlotObj(this.rrd_file,rra_idx,ds_idxs);

  // finally do the real plotting
  this.bindFlotGraph(flot_obj);
};

// ======================================
// Bind the graphs to the HTML tags
rrdFlot.prototype.bindFlotGraph = function(flot_obj) {
  var rf_this=this; // use obj inside other functions

  var graph_jq_id="#"+this.graph_id;
  var scale_jq_id="#"+this.scale_id;

  var graph_options = {
    legend: {show:true},
    lines: {show:true},
    xaxis: { mode: "time", min:flot_obj.min, max:flot_obj.max },
    selection: { mode: "x" },
  };
  var scale_options = {
    legend: {show:false},
    lines: {show:true},
    xaxis: { mode: "time", min:flot_obj.min, max:flot_obj.max },
    selection: { mode: "x" },
  };
    
  var flot_data=flot_obj.data;

  var graph_data=this.selection_range.trim_flot_data(flot_data);
  //var scale_data=flot_data.clone();
  var scale_data=flot_data;

  var graph = $.plot($(graph_jq_id), graph_data, graph_options);
  var scale = $.plot($(scale_jq_id), scale_data, scale_options);

  if (this.selection_range.isSet()) {
    scale.setSelection(this.selection_range.getFlotRanges(),true); //don't fire event, no need
  }

  // now connect the two    
  $(graph_jq_id).bind("plotselected", function (event, ranges) {
      // do the zooming
      rf_this.selection_range.setFromFlotRanges(ranges);
      graph = $.plot($(graph_jq_id), rf_this.selection_range.trim_flot_data(flot_data), graph_options);
      
      // don't fire event on the scale to prevent eternal loop
      scale.setSelection(ranges, true);
  });
    
  $(scale_jq_id).bind("plotselected", function (event, ranges) {
      graph.setSelection(ranges);
  });
};

// callback functions that are called when one of the selections changes
rrdFlot.prototype.callback_res_changed = function() {
  this.drawFlotGraph();
};

rrdFlot.prototype.callback_ds_cb_changed = function() {
  this.drawFlotGraph();
};

