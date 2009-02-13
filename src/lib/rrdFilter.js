/*
 * Filter classes for rrdFile
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
 * All filter classes must implement the following interface:
 *     getMinStep()
 *     getLastUpdate()
 *     getNrRRAs()
 *     getRRAInfo(rra_idx)
 *     getFilterRRA(rra_idx)
 *     getName()
 *
 * Where getFilterRRA returns an object implementing the following interface:
 *     getIdx()
 *     getNrRows()
 *     getStep()
 *     getCFName()
 *     getEl(row_idx)
 *     getElFast(row_idx)
 *
 */


// ================================================================
// Filter out a single DS (identified either by idx or by name)

function RRDRRAFilterDS(rrd_rra,ds_idx) {
  this.rrd_rra=rrd_rra;
  this.ds_idx=ds_idx;
}
RRDRRAFilterDS.prototype.getIdx = function() {return this.rrd_rra.getIdx();}
RRDRRAFilterDS.prototype.getNrRows = function() {return this.rrd_rra.getNrRows();}
RRDRRAFilterDS.prototype.getStep = function() {return this.rrd_rra.getStep();}
RRDRRAFilterDS.prototype.getCFName = function() {return this.rrd_rra.getCFName();}
RRDRRAFilterDS.prototype.getEl = function(row_idx) {return this.rrd_rra.getEl(row_idx,this.ds_idx);}
RRDRRAFilterDS.prototype.getElFast = function(row_idx) {return this.rrd_rra.getElFast(row_idx,this.ds_idx);}

function RRDFilterDS(rrd_file,ds_id) {
  this.rrd_file=rrd_file;
  this.ds_info=rrd_file.getDS(ds_id);
  this.ds_idx=this.ds_info.getIdx();
}
RRDFilterDS.prototype.getName = function() {return this.ds_info.getName();}
RRDFilterDS.prototype.getMinSteps = function() {return this.rrd_file.getMinSteps();}
RRDFilterDS.prototype.getLastUpdate = function() {return this.rrd_file.getLastUpdate();}
RRDFilterDS.prototype.getNrRRAs = function() {return this.rrd_file.getNrRRAs();}
RRDFilterDS.prototype.getRRAInfo = function(idx) {return this.rrd_file.getRRAInfo(idx);}
RRDFilterDS.prototype.getFilterRRA = function(idx) {return new RRDRRAFilterDS(this.rrd_file.getRRA(idx),this.ds_idx);}

// ================================================================
// Filter out by using a user provided filter object
// The object must implement the following interface
//   getName()               - Symbolic name give to this function
//   getDSName()             - list of DSs used in computing the result (names or indexes)
//   computeResult(val_list) - val_list contains the values of the requested DSs (in the same order) 

// Example class that implements the interface:
//   function sumDS(ds1,ds2) {
//     this.getName = function() {return ds1+"+"+ds2;}
//     this.getDSNames = function() {return [ds1,ds2];}
//     this.computeResult = function(val_list) {return val_list[0]+val_list[1];}
//   }


function RRDRRAFilterOp(rrd_rra,op_obj,ds_idx_list) {
  this.rrd_rra=rrd_rra;
  this.op_obj=op_obj;
  this.ds_idx_list=ds_idx_list;
}
RRDRRAFilterOp.prototype.getIdx = function() {return this.rrd_rra.getIdx();}
RRDRRAFilterOp.prototype.getNrRows = function() {return this.rrd_rra.getNrRows();}
RRDRRAFilterOp.prototype.getStep = function() {return this.rrd_rra.getStep();}
RRDRRAFilterOp.prototype.getCFName = function() {return this.rrd_rra.getCFName();}
RRDRRAFilterOp.prototype.getEl = function(row_idx) {
  var val_list=[];
  for (var i=0; i<this.ds_idx_list.length; i++) {
    val_list.push(this.rrd_rra.getEl(row_idx,this.ds_idx_list[i]));
  }
  return this.op_obj.computeResult(val_list);
}
RRDRRAFilterOp.prototype.getElFast = function(row_idx) {
  var val_list=[];
  for (var i=0; i<this.ds_idx_list.length; i++) {
    val_list.push(this.rrd_rra.getElFast(row_idx,this.ds_idx_list[i]));
  }
  return this.op_obj.computeResult(val_list);
}

function RRDFilterOp(rrd_file,op_obj) {
  this.rrd_file=rrd_file;
  this.op_obj=op_obj;
  var ds_names=op_obj.getDSNames();
  var ds_idx_list=[];
  for (var i=0; i<ds_names.length; i++) {
    ds_idx_list.push(rrd_file.getDS(ds_names[i]).getIdx());
  }
  this.ds_idx_list=ds_idx_list;
}
RRDFilterOp.prototype.getName = function() {return this.op_obj.getName();}
RRDFilterOp.prototype.getMinSteps = function() {return this.rrd_file.getMinSteps();}
RRDFilterOp.prototype.getLastUpdate = function() {return this.rrd_file.getLastUpdate();}
RRDFilterOp.prototype.getNrRRAs = function() {return this.rrd_file.getNrRRAs();}
RRDFilterOp.prototype.getRRAInfo = function(idx) {return this.rrd_file.getRRAInfo(idx);}
 RRDFilterOp.prototype.getFilterRRA = function(idx) {return new RRDRRAFilterOp(this.rrd_file.getRRA(idx),this.op_obj,this.ds_idx_list);}

