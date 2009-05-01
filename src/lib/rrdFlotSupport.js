/*
 * Support library aimed at providing commonly used functions and classes
 * that may be used while plotting RRD files with Flot
 *
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

// Return a Flot-like data structure
// Since Flot does not properly handle empty elements, min and max are returned, too
function rrdDS2FlotSeries(rrd_file,ds_id,rra_idx,want_rounding) {
  var ds=rrd_file.getDS(ds_id);
  var ds_name=ds.getName();
  var ds_idx=ds.getIdx();
  var rra=rrd_file.getRRA(rra_idx);
  var rra_rows=rra.getNrRows();
  var last_update=rrd_file.getLastUpdate();
  var step=rra.getStep();

  if (want_rounding!=false) {
    // round last_update to step
    // so that all elements are sync
    last_update-=(last_update%step); 
  }

  var first_el=last_update-(rra_rows-1)*step;
  var timestamp=first_el;
  var flot_series=[];
  for (var i=0;i<rra_rows;i++) {
    var el=rra.getEl(i,ds_idx);
    if (el!=undefined) {
      flot_series.push([timestamp*1000.0,el]);
    }
    timestamp+=step;
  } // end for

  return {label: ds_name, data: flot_series, min: first_el*1000.0, max:last_update*1000.0};
}

// return an object with an array containing Flot elements, one per DS
// min and max are also returned
function rrdRRA2FlotObj(rrd_file,rra_idx,ds_list,want_ds_labels,want_rounding) {
  var rra=rrd_file.getRRA(rra_idx);
  var rra_rows=rra.getNrRows();
  var last_update=rrd_file.getLastUpdate();
  var step=rra.getStep();
  if (want_rounding!=false) {
    // round last_update to step
    // so that all elements are sync
    last_update-=(last_update%step); 
  }

  var first_el=last_update-(rra_rows-1)*step;

  var out_el={data:[], min:first_el*1000.0, max:last_update*1000.0};

  for (ds_list_idx in ds_list) {
    var ds_id=ds_list[ds_list_idx];
    var ds=rrd_file.getDS(ds_id);
    var ds_name=ds.getName();
    var ds_idx=ds.getIdx();

    var timestamp=first_el;
    var flot_series=[];
    for (var i=0;i<rra_rows;i++) {
      var el=rra.getEl(i,ds_idx);
      if (el!=undefined) {
	flot_series.push([timestamp*1000.0,el]);
      }
      timestamp+=step;
    } // end for
    
    var flot_el={data:flot_series};
    if (want_ds_labels!=false) {
      var ds_name=ds.getName();
      flot_el.label= ds_name;
    }
    out_el.data.push(flot_el);
  } //end for ds_list_idx
  return out_el;
}

// return an object with an array containing Flot elements
//  have a positive and a negative stack of DSes, plus DSes with no stacking
// min and max are also returned
// If one_undefined_enough==true, a whole stack is invalidated is a single element
//  of the stack is invalid
function rrdRRAStackFlotObj(rrd_file,rra_idx,
			    ds_positive_stack_list,ds_negative_stack_list,ds_single_list,
			    want_ds_labels,want_rounding,one_undefined_enough) {
  var rra=rrd_file.getRRA(rra_idx);
  var rra_rows=rra.getNrRows();
  var last_update=rrd_file.getLastUpdate();
  var step=rra.getStep();
  if (want_rounding!=false) {
    // round last_update to step
    // so that all elements are sync
    last_update-=(last_update%step); 
  }
  if (one_undefined_enough!=true) { // make sure it is a boolean
    one_undefined_enough=false;
  }

  var first_el=last_update-(rra_rows-1)*step;

  var out_el={data:[], min:first_el*1000.0, max:last_update*1000.0};

  // first the stacks stack
  var stack_els=[ds_positive_stack_list,ds_negative_stack_list];
  for (stack_list_id in stack_els) {
    var stack_list=stack_els[stack_list_id];
    var tmp_flot_els=[];
    var tmp_ds_ids=[];
    var tmp_nr_ids=stack_list.length;
    for (ds_list_idx in stack_list) {
      var ds_id=stack_list[ds_list_idx];
      var ds=rrd_file.getDS(ds_id);
      var ds_name=ds.getName();
      var ds_idx=ds.getIdx();
      tmp_ds_ids.push(ds_idx); // getting this is expensive, call only once
      
      // initialize
      var flot_el={data:[]}
      if (want_ds_labels!=false) {
	var ds_name=ds.getName();
	flot_el.label= ds_name;
      }
      tmp_flot_els.push(flot_el);
    }

    var timestamp=first_el;
    for (var row=0;row<rra_rows;row++) {
      var ds_vals=[];
      var all_undef=true;
      var all_def=true;
      for (var id=0; id<tmp_nr_ids; id++) {
	var ds_idx=tmp_ds_ids[id];
	var el=rra.getEl(row,ds_idx);
	if (el!=undefined) {
	  all_undef=false;
	  ds_vals.push(el);
	} else {
	  all_def=false;
	  ds_vals.push(0);
	}
      } // end for id
      if (!all_undef) { // if all undefined, skip
	if (all_def || (!one_undefined_enough)) {
	  // this is a valid column, do the math
	  for (var id=1; id<tmp_nr_ids; id++) {
	    ds_vals[id]+=ds_vals[id-1]; // both positive and negative stack use a +, negative stack assumes negative values
	  }
	  // fill the flot data
	  for (var id=0; id<tmp_nr_ids; id++) {
	    tmp_flot_els[id].data.push([timestamp*1000.0,ds_vals[id]]);
	  }
	}
      } // end if

      timestamp+=step;
    } // end for row
    
    // put flot data in output object
    // reverse order so higher numbers are behind
    for (var id=0; id<tmp_nr_ids; id++) {
      out_el.data.push(tmp_flot_els[tmp_nr_ids-id-1]);
    }
  } //end for stack_list_id

  for (ds_list_idx in ds_single_list) {
    var ds_id=ds_single_list[ds_list_idx];
    var ds=rrd_file.getDS(ds_id);
    var ds_name=ds.getName();
    var ds_idx=ds.getIdx();

    var timestamp=first_el;
    var flot_series=[];
    for (var i=0;i<rra_rows;i++) {
      var el=rra.getEl(i,ds_idx);
      if (el!=undefined) {
	flot_series.push([timestamp*1000.0,el]);
      }
      timestamp+=step;
    } // end for
    
    var flot_el={data:flot_series};
    if (want_ds_labels!=false) {
      var ds_name=ds.getName();
      flot_el.label= ds_name;
    }
    out_el.data.push(flot_el);
  } //end for ds_list_idx

  return out_el;
}

// ======================================
// Helper class for handling selections
// =======================================================
function rrdFlotSelection() {
  this.selection_min=null;
  this.selection_max=null;
};

// reset to a state where ther is no selection
rrdFlotSelection.prototype.reset = function() {
  this.selection_min=null;
  this.selection_max=null;
};

// given the selection ranges, set internal variable accordingly
rrdFlotSelection.prototype.setFromFlotRanges = function(ranges) {
  this.selection_min=ranges.xaxis.from;
  this.selection_max=ranges.xaxis.to;
};

// Return a Flot ranges structure that can be promptly used in setSelection
rrdFlotSelection.prototype.getFlotRanges = function() {
  return { xaxis: {from: this.selection_min, to: this.selection_max}};
};

// return true is a selection is in use
rrdFlotSelection.prototype.isSet = function() {
  return this.selection_min!=null;
};

// Given an array of flot lines, limit to the selection
rrdFlotSelection.prototype.trim_flot_data = function(flot_data) {
  var out_data=[];
  for (var i=0; i<flot_data.length; i++) {
    var data_el=flot_data[i];
    out_data.push({label : data_el.label, data:this.trim_data(data_el.data), color:data_el.color, lines:data_el.lines, yaxis:data_el.yaxis});
  }
  return out_data;
};

// Limit to selection the flot series data element
rrdFlotSelection.prototype.trim_data = function(data_list) {
  if (this.selection_min==null) return data_list; // no selection => no filtering

  var out_data=[];
  for (var i=0; i<data_list.length; i++) {
    if (data_list[i]==null) continue; // protect
    var nr=data_list[i][0];
    if ((nr>=this.selection_min) && (nr<=this.selection_max)) {
      out_data.push(data_list[i]);
    }
  }
  return out_data;
};

