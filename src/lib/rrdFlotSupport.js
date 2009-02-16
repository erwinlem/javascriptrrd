/*
 * Support library for grpahing RRD files with Flot
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

function rrdDS2FlotSeries(rrd_file,ds_id,rra_idx,want_label) {
  var ds=rrd_file.getDS(ds_id);
  var ds_name=ds.getName();
  var ds_idx=ds.getIdx();
  var rra=rrd_file.getRRA(rra_idx);
  var rra_rows=rra.getNrRows();
  var last_update=rrd_file.getLastUpdate();
  var step=rra.getStep();

  var flot_series=[];
  for (var i=0;i<rra_rows;i++) {
    var timestamp=(last_update+(i-rra_rows+1)*step)*1000.0;
    var el=rra.getEl(i,ds_idx);
    if (el!=undefined) {
      flot_series.push([timestamp,el]);
    } else {
      flot_series.push([timestamp,null]);
    } 
  } // end for

  if (want_label!=false) {
    return {label: ds_name, data: flot_series};
  } else {
    return {data:flot_series};
  }
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
    out_data.push({label : data_el.label, data:this.trim_data(data_el.data)});
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

