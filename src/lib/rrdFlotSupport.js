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
      if ((i>0) && ((i+1)<rra_rows)) {
	flot_series.push([timestamp,null]);
      } else {
	// Flot misbehaves if first or last point is null
	flot_series.push([timestamp,0]);
      } 
    } 
  } // end for

  if (want_label!=false) {
    return {label: ds_name, data: flot_series};
  } else {
    return {data:flot_series};
  }
}

