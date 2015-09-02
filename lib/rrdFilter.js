/**
 * This class filters out a subset of DSs from an RRA identified by index or name.
 *
 * The constructor has two arguments: rrd_rra (the RRA) and ds_list (the list of DSs to filter).
 * @constructor
 * @private
 */
function RRDRRAFilterDS(rrd_rra, ds_list) {
	this.rrd_rra = rrd_rra;
	this.ds_list = ds_list;
}

/**
 * Return which RRA it is in the RRD file.
 */
RRDRRAFilterDS.prototype.getIdx = function() {
	return this.rrd_rra.getIdx();
};

/**
 * Return the number of rows in the RRA.
 */
RRDRRAFilterDS.prototype.getNrRows = function() {
	return this.rrd_rra.getNrRows();
};

/**
 * Return the number of DSs in the RRD file.
 */
RRDRRAFilterDS.prototype.getNrDSs = function() {
	return this.ds_list.length;
};

/**
 * Return the number of seconds between rows.
 */
RRDRRAFilterDS.prototype.getStep = function() {
	return this.rrd_rra.getStep();
};

/**
 * Return the Consolidation Function used by the RRA.
 */
RRDRRAFilterDS.prototype.getCFName = function() {
	return this.rrd_rra.getCFName();
};

/**
 * Return the value for the d-th DS in the r-th row.
 */
RRDRRAFilterDS.prototype.getEl = function(row_idx, ds_idx) {
	if ((ds_idx >= 0) && (ds_idx < this.ds_list.length)) {
		var real_ds_idx = this.ds_list[ds_idx].real_ds_idx;
		return this.rrd_rra.getEl(row_idx, real_ds_idx);
	} else {
		throw RangeError("DS idx (" + ds_idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};

/**
 * Return the low-precision value for the d-th DS in the r-th row.
 */
RRDRRAFilterDS.prototype.getElFast = function(row_idx, ds_idx) {
	if ((ds_idx >= 0) && (ds_idx < this.ds_list.length)) {
		var real_ds_idx = this.ds_list[ds_idx].real_ds_idx;
		return this.rrd_rra.getElFast(row_idx, real_ds_idx);
	} else {
		throw RangeError("DS idx (" + ds_idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};

/**
 * This class filters out a subset of DSs from an RRD identified by index or name.
 * @deprecated use RRDFilterOp instead
 * @constructor
 */
function RRDFilterDS(rrd_file, ds_id_list) {
	this.rrd_file = rrd_file;
	this.ds_list = [];
	for (var i = 0; i < ds_id_list.length; i++) {
		var org_ds = rrd_file.getDS(ds_id_list[i]);
		// must create a new copy, as the index has changed
		var new_ds = new RRDDS(org_ds.rrd_data, org_ds.rrd_data_idx, i);
		// then extend it to include the real RRD index
		new_ds.real_ds_idx = org_ds.my_idx;

		this.ds_list.push(new_ds);
	}
}

/**
 * Return the base interval in seconds that was used to feed the RRD file.
 */
RRDFilterDS.prototype.getMinStep = function() {
	return this.rrd_file.getMinStep();
};

/**
 * Return the timestamp of the last update.
 */
RRDFilterDS.prototype.getLastUpdate = function() {
	return this.rrd_file.getLastUpdate();
};

/**
 * Return the number of Data Sources present in the RRD file.
 */
RRDFilterDS.prototype.getNrDSs = function() {
	return this.ds_list.length;
};

/**
 * Return the names of the Data Sources present in the RRD file.
 */
RRDFilterDS.prototype.getDSNames = function() {
	var ds_names = [];
	for (var i = 0; i < this.ds_list.length; i++) {
		ds_names.push(ds_list[i].getName());
	}
	return ds_names;
};

/**
 * If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.

If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
 */
RRDFilterDS.prototype.getDS = function(id) {
	if (typeof id == "number") {
		return this.getDSbyIdx(id);
	} else {
		return this.getDSbyName(id);
	}
};

// INTERNAL: Do not call directly
RRDFilterDS.prototype.getDSbyIdx = function(idx) {
	if ((idx >= 0) && (idx < this.ds_list.length)) {
		return this.ds_list[idx];
	} else {
		throw RangeError("DS idx (" + idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};

// INTERNAL: Do not call directly
RRDFilterDS.prototype.getDSbyName = function(name) {
	for (var idx = 0; idx < this.ds_list.length; idx++) {
		var ds = this.ds_list[idx];
		var ds_name = ds.getName();
		if (ds_name == name)
			return ds;
	}
	throw RangeError("DS name " + name + " unknown.");
};

/**
 * Return the number of Round Robin Archives present in the RRD file. 
 */
RRDFilterDS.prototype.getNrRRAs = function() {
	return this.rrd_file.getNrRRAs();
};

/**
 * Return an object of type RRDRRAInfo holding the information about the n-th Round Robin Archive.
 */
RRDFilterDS.prototype.getRRAInfo = function(idx) {
	return this.rrd_file.getRRAInfo(idx);
};

/**
 * Return an object of type RRDRRA that can be used to access the values stored in the n-th Round Robin Archive.
 */
RRDFilterDS.prototype.getRRA = function(idx) {
	return new RRDRRAFilterDS(this.rrd_file.getRRA(idx), this.ds_list);
};

// ================================================================
// Filter out by using a user provided filter object
// The object must implement the following interface
//   getName()               - Symbolic name give to this function
//   getDSName()             - list of DSs used in computing the result (names or indexes)
//   computeResult(val_list) - val_list contains the values of the requested DSs (in the same order) 

// If the element is a string or a number, it will just use that ds

// Example class that implements the interface:
//   function DoNothing(ds_name) { //Leaves the DS alone.
//     this.getName = function() {return ds_name;}
//     this.getDSNames = function() {return [ds_name];}
//     this.computeResult = function(val_list) {return val_list[0];}
//   }
//   function sumDS(ds1_name,ds2_name) { //Sums the two DSs.
//     this.getName = function() {return ds1_name+"+"+ds2_name;}
//     this.getDSNames = function() {return [ds1_name,ds2_name];}
//     this.computeResult = function(val_list) {return val_list[0]+val_list[1];}
//   }
//
// So to add a summed DS of your 1st and second DS: 
// var ds0_name = rrd_data.getDS(0).getName();
// var ds1_name = rrd_data.getDS(1).getName();
// rrd_data = new RRDFilterOp(rrd_data, [new DoNothing(ds0_name), 
//                DoNothing(ds1_name), sumDS(ds0_name, ds1_name]);
//
// You get the same resoult with
// rrd_data = new RRDFilterOp(rrd_data, [ds0_name,1,new sumDS(ds0_name, ds1_name)]);
////////////////////////////////////////////////////////////////////

// this implements the conceptual NoNothing above
function RRDFltOpIdent(ds_name) {
	this.getName = function() {
		return ds_name;
	};
	this.getDSNames = function() {
		return [ds_name];
	};
	this.computeResult = function(val_list) {
		return val_list[0];
	};
}

// similar to the above, but extracts the name from the index
// requires two parametes, since it it need context
function RRDFltOpIdentId(rrd_data, id) {
	this.ds_name = rrd_data.getDS(id).getName();
}

RRDFltOpIdentId.prototype.getName = function() {
	return this.ds_name;
};

RRDFltOpIdentId.prototype.getDSNames = function() {
	return [this.ds_name];
};

RRDFltOpIdentId.prototype.computeResult = function(val_list) {
	return val_list[0];
};

/**
 * This class filters DSs from an RRD by using a user-provided filter object.
 *
 * This class has three arguments: rrd_file, op_object (the filter object) and my_idx (index of new DS in case old one was modified by a filter).
 *
 * @constructor
 * @private
 */
function RRDDSFilterOp(rrd_file, op_obj, my_idx) {
	this.rrd_file = rrd_file;
	this.op_obj = op_obj;
	this.my_idx = my_idx;
	var ds_names = op_obj.getDSNames();
	var ds_idx_list = [];
	for (var i = 0; i < ds_names.length; i++) {
		ds_idx_list.push(rrd_file.getDS(ds_names[i]).getIdx());
	}
	this.ds_idx_list = ds_idx_list;
}

/**
 * Return which DS it is in the RRD file.
 */
RRDDSFilterOp.prototype.getIdx = function() {
	return this.my_idx;
};

/**
 * Return the name of the data source.
 */
RRDDSFilterOp.prototype.getName = function() {
	return this.op_obj.getName();
};

/**
 * Return the type of the data source.
 */
RRDDSFilterOp.prototype.getType = function() {
	return "function";
};

/**
 * Return the minimum value the data source can contain.
 */
RRDDSFilterOp.prototype.getMin = function() {
	return undefined;
};

/**
 * Return the maximum value the data source can contain.
 */
RRDDSFilterOp.prototype.getMax = function() {
	return undefined;
};

/**
 * Returns which DSs is being used in the Filter.
 */
RRDDSFilterOp.prototype.getRealDSList = function() {
	return this.ds_idx_list;
};

/**
 * Return the computed result of the filter object on the DSs.
 */
RRDDSFilterOp.prototype.computeResult = function(val_list) {
	return this.op_obj.computeResult(val_list);
};

// ------ --------------------------------------------
//Private
function RRDRRAFilterOp(rrd_rra, ds_list) {
	this.rrd_rra = rrd_rra;
	this.ds_list = ds_list;
}
RRDRRAFilterOp.prototype.getIdx = function() {
	return this.rrd_rra.getIdx();
};
RRDRRAFilterOp.prototype.getNrRows = function() {
	return this.rrd_rra.getNrRows();
};
RRDRRAFilterOp.prototype.getNrDSs = function() {
	return this.ds_list.length;
};
RRDRRAFilterOp.prototype.getStep = function() {
	return this.rrd_rra.getStep();
};
RRDRRAFilterOp.prototype.getCFName = function() {
	return this.rrd_rra.getCFName();
};
RRDRRAFilterOp.prototype.getEl = function(row_idx, ds_idx) {
	if ((ds_idx >= 0) && (ds_idx < this.ds_list.length)) {
		var ds_idx_list = this.ds_list[ds_idx].getRealDSList();
		var val_list = [];
		for (var i = 0; i < ds_idx_list.length; i++) {
			val_list.push(this.rrd_rra.getEl(row_idx, ds_idx_list[i]));
		}
		return this.ds_list[ds_idx].computeResult(val_list);
	} else {
		throw RangeError("DS idx (" + ds_idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};
RRDRRAFilterOp.prototype.getElFast = function(row_idx, ds_idx) {
	if ((ds_idx >= 0) && (ds_idx < this.ds_list.length)) {
		var ds_idx_list = this.ds_list[ds_idx].getRealDSList();
		var val_list = [];
		for (var i = 0; i < ds_idx_list.length; i++) {
			val_list.push(this.rrd_rra.getEl(row_idx, ds_idx_list[i]));
		}
		return this.ds_list[ds_idx].computeResult(val_list);
	} else {
		throw RangeError("DS idx (" + ds_idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};

/**
 * This class filters all of the DSs in an RRD by a list of filter objects.
 * 
 *  The filter object must implement the following interface
 *    getName()               - Symbolic name give to this function
 *    getDSName()             - list of DSs used in computing the result (names or indexes)
 *    computeResult(val_list) - val_list contains the values of the requested DSs (in the same order) 
 * 
 *  Example classes that implement the interface:
 *    function Itentity(ds_name) { //Leaves the DS alone.
 *      this.getName = function() {return ds_name;}
 *      this.getDSNames = function() {return [ds_name];}
 *      this.computeResult = function(val_list) {return val_list[0];}
 *    }
 *    function sumDS(ds1_name,ds2_name) { //Sums the two DSs.
 *      this.getName = function() {return ds1_name+"+"+ds2_name;}
 *      this.getDSNames = function() {return [ds1_name,ds2_name];}
 *      this.computeResult = function(val_list) {return val_list[0]+val_list[1];}
 *    }
 * 
 *  Lets say you have 2 DSs. To add a summed DS of DS1 and DS2: 
 *  var ds0_name = rrd_data.getDS(0).getName();
 *  var ds1_name = rrd_data.getDS(1).getName();
 *  rrd_data = new RRDFilterOp(rrd_data, [new Identity(ds0_name), 
 *                      new Itentity(ds1_name), new sumDS(ds0_name, ds1_name]);
 * If a string is passed, it is assumed to be the name of a DS, and the Identity transformation is applied.
 * If an integer is passed, it is assumed to be the index or a DS, and the Identity equivalent is applied.
 * So this gives an equivalent result:
 * 
 *  rrd_data = new RRDFilterOp(rrd_data, [ds0_name,1, new sumDS(ds0_name, ds1_name]);
 * Its arguments are: rrd_file and op_obj_list (list of ds filters).
 * @constructor
 */
function RRDFilterOp(rrd_file, op_obj_list) {
	this.rrd_file = rrd_file;
	this.ds_list = [];
	for (var i in op_obj_list) {
		var el = op_obj_list[i];
		var outel = null;
		if (typeof(el) == "string") {
			outel = new RRDFltOpIdent(el);
		} else if (typeof(el) == "number") {
			outel = new RRDFltOpIdentId(this.rrd_file, el);
		} else {
			outel = el;
		}
		this.ds_list.push(new RRDDSFilterOp(rrd_file, outel, i));
	}
}

/**
 * Return the base interval in seconds that was used to feed the RRD file.
 */
RRDFilterOp.prototype.getMinStep = function() {
	return this.rrd_file.getMinStep();
};

/**
 * Return the timestamp of the last update.
 */
RRDFilterOp.prototype.getLastUpdate = function() {
	return this.rrd_file.getLastUpdate();
};

/**
 * Return the number of Data Sources present in the RRD file.
 */
RRDFilterOp.prototype.getNrDSs = function() {
	return this.ds_list.length;
};

/**
 * Return the names of the Data Sources present in the RRD file.
 */
RRDFilterOp.prototype.getDSNames = function() {
	var ds_names = [];
	for (var i = 0; i < this.ds_list.length; i++) {
		ds_names.push(ds_list[i].getName());
	}
	return ds_names;
};

/**
 * If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.
 *
 * If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
 */
RRDFilterOp.prototype.getDS = function(id) {
	if (typeof id == "number") {
		return this.getDSbyIdx(id);
	} else {
		return this.getDSbyName(id);
	}
};

// INTERNAL: Do not call directly
RRDFilterOp.prototype.getDSbyIdx = function(idx) {
	if ((idx >= 0) && (idx < this.ds_list.length)) {
		return this.ds_list[idx];
	} else {
		throw RangeError("DS idx (" + idx + ") out of range [0-" + this.ds_list.length + ").");
	}
};

// INTERNAL: Do not call directly
RRDFilterOp.prototype.getDSbyName = function(name) {
	for (var idx = 0; idx < this.ds_list.length; idx++) {
		var ds = this.ds_list[idx];
		var ds_name = ds.getName();
		if (ds_name == name)
			return ds;
	}
	throw RangeError("DS name " + name + " unknown.");
};

/**
 * Return the number of Round Robin Archives present in the RRD file.
 */
RRDFilterOp.prototype.getNrRRAs = function() {
	return this.rrd_file.getNrRRAs();
};

/**
 * Return an object of type RRDRRAInfo holding the information about the n-th Round Robin Archive.
 */
RRDFilterOp.prototype.getRRAInfo = function(idx) {
	return this.rrd_file.getRRAInfo(idx);
};

/**
 * Return an object of type RRDRRA that can be used to access the values stored in the n-th Round Robin Archive.
 */
RRDFilterOp.prototype.getRRA = function(idx) {
	return new RRDRRAFilterOp(this.rrd_file.getRRA(idx), this.ds_list);
};


/**
 * This class creates new, time-shifted RRAs. Originally developed for timezone shifting. Currently to be considered deprecated.
 * Shift RRAs in rra_list by the integer shift_int (in seconds).
 * Only change is getLastUpdate - this takes care of everything.
 * Example: To shift the first three 3 RRAs in the file by one hour, 
 *         rrd_data = new RRAFilterShift(rra_data, 3600, [0,1,2]);
 * 
 * Arguments:
 * 1. The RRD File
 * 2. Shift Int - the number of seconds to shift by (1 hour = 3600s)
 * 3. RRA index List - A list of the RRAs (by their indicies) to be shifted; usually all RRAs in the File are included.
 * @deprecated This function is archaic, and will likely be deprecated in future releases
 * @constructor
 */

function RRAFilterShift(rrd_file, shift_int, rra_list) {
	this.rrd_file = rrd_file;
	this.shift_int = shift_int;
	this.rra_list = rra_list;
	this.shift_in_seconds = this.shift_int * 3600; //number of steps needed to move 1 hour
}

/**
 * Return the base interval in seconds that was used to feed the RRD file.
 */
RRAFilterShift.prototype.getMinStep = function() {
	return this.rrd_file.getMinStep();
};

/**
 * Return the timestamp of the last update.
 */
RRAFilterShift.prototype.getLastUpdate = function() {
	return this.rrd_file.getLastUpdate() + this.shift_in_seconds;
};

/**
 * Return the number of Data Sources present in the RRD file.
 */
RRAFilterShift.prototype.getNrDSs = function() {
	return this.rrd_file.getNrDSs();
};

/**
 * Return the names of the Data Sources present in the RRD file.
 */
RRAFilterShift.prototype.getDSNames = function() {
	return this.rrd_file.getDSNames();
};

/**
 * If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.
 *
 * If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
 */
RRAFilterShift.prototype.getDS = function(id) {
	return this.rrd_file.getDS(id);
};

/**
 * Return the number of Round Robin Archives present in the RRD file.
 */
RRAFilterShift.prototype.getNrRRAs = function() {
	return this.rra_list.length;
};

/**
 * Return an object of type RRDRRAInfo holding the information about the n-th Round Robin Archive.
 */
RRAFilterShift.prototype.getRRAInfo = function(idx) {
	return this.rrd_file.getRRAInfo(idx);
};

/**
 * Return an object of type RRDRRA that can be used to access the values stored in the n-th Round Robin Archive.
 */
RRAFilterShift.prototype.getRRA = function(idx) {
	return this.rrd_file.getRRA(idx);
};

// ================================================================
// Filter RRAs by using a user provided filter object
// The object must implement the following interface
//   getIdx()               - Index of RRA to use
//   getStep()              - new step size (return null to use step size of RRA specified by getIdx() 

// If a number is passed, it implies to just use the RRA as it is
// If an array is passed, it is assumed to be [rra_id,new_step_in_seconds] 
//    and a RRDRRAFltAvgOpNewStep object will be instantiated internally

/* Example classes that implements the interface:
 *
 *      //This RRA Filter object leaves the original RRA unchanged.
 *
 *      function RRADoNothing(rra_idx) {
 *         this.getIdx = function() {return rra_idx;}
 *         this.getStep = function() {return null;} 
 *      }
 *      
 *      // This Filter creates a new RRA with a different step size 
 *      // based on another RRA, whose data the new RRA averages. 
 *      // rra_idx should be index of RRA with largest step size 
 *      // that doesn't exceed new step size.  
 *
 *      function RRA_Avg(rra_idx,new_step_in_seconds) {
 *         this.getIdx = function() {return rra_idx;}
 *         this.getStep = function() {return new_step_in_seconds;}
 *      }
 *      //For example, if you have two RRAs, one with a 5 second step,
 *      //and another with a 60 second step, and you'd like a 30 second step,
 *      //rrd_data = new RRDRRAFilterAvg(rrd_data,[new RRADoNothing(0), new RRDDoNothing(1),new RRA_Avg(1,30)];)
 */

// Users can use this one directly for simple use cases
// It is equivalent to RRADoNothing and RRA_Avg above
function RRDRRAFltAvgOpNewStep(rra_idx, new_step_in_seconds) {
	this.rra_idx = rra_idx;
	this.new_step_in_seconds = new_step_in_seconds;
}

RRDRRAFltAvgOpNewStep.prototype.getIdx = function() {
	return this.rra_idx;
};
RRDRRAFltAvgOpNewStep.prototype.getStep = function() {
	return this.new_step_in_seconds;
};


/**
 * This class implements the methods needed to access the new RRA. The filter only changes the PdpPerRow.
 * @constructor
 * @private
 */
function RRAInfoFilterAvg(rrd_file, rra, op_obj, idx) {
	this.rrd_file = rrd_file;
	this.op_obj = op_obj;
	this.base_rra = rrd_file.getRRA(this.op_obj.getIdx());
	this.rra = rra;
	this.idx = idx;
	var scaler = 1;
	if (this.op_obj.getStep() !== null) {
		scaler = this.op_obj.getStep() / this.base_rra.getStep();
	}
	this.scaler = scaler;
}

/**
 * Return which RRA it is in the RRD file.
 */
RRAInfoFilterAvg.prototype.getIdx = function() {
	return this.idx;
};

/**
 * Return the number of rows in the RRA.
 */
RRAInfoFilterAvg.prototype.getNrRows = function() {
	return this.rra.getNrRows();
};

/**
 * Return the number of seconds between rows.
 */
RRAInfoFilterAvg.prototype.getStep = function() {
	return this.rra.getStep();
};

/**
 * Return the Consolidation Function used by the RRA.
 */
RRAInfoFilterAvg.prototype.getCFName = function() {
	return this.rra.getCFName();
};

/**
 * Return number of slots used for consolidation.
 */
RRAInfoFilterAvg.prototype.getPdpPerRow = function() {
	return this.rrd_file.getRRAInfo(this.op_obj.getIdx()).getPdpPerRow() * this.scaler;
};

/**
 * The constructor has two arguments: the RRA and the Filter object for that RRA.
 *
 * The filter changes the NrRows (number of rows) and the way the elements are fetched (getEl and getElFast).
 *
 * All other attributes are copied from the base RRA (the rra given in the arguments).
 *
 * @constructor
 * @private
 */
function RRAFilterAvg(rrd_file, op_obj) {
	this.rrd_file = rrd_file;
	this.op_obj = op_obj;
	this.base_rra = rrd_file.getRRA(op_obj.getIdx());
	var scaler = 1;
	if (op_obj.getStep() !== null) {
		scaler = op_obj.getStep() / this.base_rra.getStep();
	}
	this.scaler = Math.floor(scaler);
}

/**
 * Return which RRA it is in the RRD file (real index, not base RRA index).
 */
RRAFilterAvg.prototype.getIdx = function() {
	return this.op_obj.getIdx();
};

/**
 * Return the Consolidation Function used by the RRA.
 */
RRAFilterAvg.prototype.getCFName = function() {
	return this.base_rra.getCFName();
};

/**
 * Return the number of rows in the RRA.
 */
RRAFilterAvg.prototype.getNrRows = function() {
	return Math.floor(this.base_rra.getNrRows() / this.scaler);
};

/**
 * Return the number of DSs in the RRD file.
 */
RRAFilterAvg.prototype.getNrDSs = function() {
	return this.base_rra.getNrDSs();
};

/**
 * Return the number of seconds between rows.
 */
RRAFilterAvg.prototype.getStep = function() {
	if (this.op_obj.getStep() !== null) {
		return this.op_obj.getStep();
	} else {
		return this.base_rra.getStep();
	}
};

/**
 * Return the value for the d-th DS in the r-th row, modified by the filter.
 */
RRAFilterAvg.prototype.getEl = function(row, ds) {
	var sum = 0;
	for (var i = 0; i < this.scaler; i++) {
		sum += this.base_rra.getEl((this.scaler * row) + i, ds);
	}
	return sum / this.scaler;
};

/**
 * Return the low-precision value for the d-th DS in the r-th row, modified by the filter.
 */
RRAFilterAvg.prototype.getElFast = function(row, ds) {
	var sum = 0;
	for (var i = 0; i < this.scaler; i++) {
		sum += this.base_rra.getElFast((this.scaler * row) + i, ds);
	}
	return sum / this.scaler;
};

/**
 * This class creates new RRAs (based on original RRAs in the RRD File) that have different time steps. This is useful for creating new RRA graphs with different time steps without actually creating and filling new RRAs.
 * 
 * Arguments:
 * 1. The RRD File
 * 2. List of Filter Objects. Each object must instantiate getIdx, which returns the index of the RRA to use in the RRD File, and getStep, which returns the step size of the RRA. (If getStep returns null, the filter will use the original step size given by the RRA specified by getIdx).
 * Examples of RRA Filter Objects:
 * 
 * 
 *       //This RRA Filter object leaves the original RRA unchanged.
 *       function RRAIdentity(rra_idx) {
 *          this.getIdx = function() {return rra_idx;}
 *          this.getStep = function() {return null;} 
 *       }
 *       
 *       // This Filter creates a new RRA with a different step size 
 *       // based on another RRA, whose data the new RRA averages. 
 *       // rra_idx should be index of RRA with largest step size 
 *       // that doesn't exceed new step size. 
 * 
 *       function RRA_Avg(rra_idx,new_step_in_seconds) {
 *          this.getIdx = function() {return rra_idx;}
 *          this.getStep = function() {return new_step_in_seconds;}
 *       }
 * For instance, if you have 3 RRAs with 5 second, 60 second and 3600 second intervals, and would like an RRA with 1800 second steps along with them, create:
 * 
 * 
 *       object_list = [new RRAIdentity(0), new RRAIdentity(1), new RRAItentity(2), new RRA_Avg(1,1800)].  
 *       new RRDRRAFilterAvg(rrd_file, object_list);
 * It's best to use the RRA with the next smallest step size as a basis. It's also best to make steps integer multiples of the original RRA step sizes. For instance, using a 45 minute step, a 6 hour (= 45mins x 8) step would be better than 4 hour step (=45 mins x 5.33...).
 * 
 * Given that the above classes are likely the most useful ones, the user can use an integer instead of a RRAIdentity object, and an Array(2) instead of the RRA_Avg object:
 * 
 *  
 *       object_list = [0,1,2,[1,1800]]
 *       new RRDRRAFilterAvg(rrd_file, object_list);
 * @constructor
 */
function RRDRRAFilterAvg(rrd_file, op_obj_list) {
	this.rrd_file = rrd_file;
	this.op_obj_list = [];
	this.rra_list = [];
	for (var i in op_obj_list) {
		var el = op_obj_list[i];
		var outel = null;
		if (Object.prototype.toString.call(el) == "[object Number]") {
			outel = new RRDRRAFltAvgOpNewStep(el, null);
		} else if (Object.prototype.toString.call(el) == "[object Array]") {
			outel = new RRDRRAFltAvgOpNewStep(el[0], el[1]);
		} else {
			outel = el;
		}
		this.op_obj_list.push(outel);
		this.rra_list.push(new RRAFilterAvg(rrd_file, outel));
	}
}

/**
 * Return the base interval in seconds that was used to feed the RRD file.
 */
RRDRRAFilterAvg.prototype.getMinStep = function() {
	return this.rrd_file.getMinStep();
}; 

/**
 * Return the timestamp of the last update.
 */
RRDRRAFilterAvg.prototype.getLastUpdate = function() {
	return this.rrd_file.getLastUpdate();
};

/**
 * Return the number of Data Sources present in the RRD file.
 */
RRDRRAFilterAvg.prototype.getNrDSs = function() {
	return this.rrd_file.getNrDSs();
}; 

/**
 * Return the names of the Data Sources present in the RRD file.
 */
RRDRRAFilterAvg.prototype.getDSNames = function() {
	return this.rrd_file.getDSNames();
};

/**
 * If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.

If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
 */
RRDRRAFilterAvg.prototype.getDS = function(id) {
	return this.rrd_file.getDS(id);
};

/**
 * Return the number of Round Robin Archives present in the RRD file.
 */
RRDRRAFilterAvg.prototype.getNrRRAs = function() {
	return this.rra_list.length;
};

/**
 * Return an object of type RRDRRAInfo holding the information about the n-th Round Robin Archive.
 */
RRDRRAFilterAvg.prototype.getRRAInfo = function(idx) {
	if ((idx >= 0) && (idx < this.rra_list.length)) {
		return new RRAInfoFilterAvg(this.rrd_file, this.rra_list[idx], this.op_obj_list[idx], idx);
	} else {
		return this.rrd_file.getRRAInfo(0);
	}
};

/**
 * Return an object of type RRDRRA that can be used to access the values stored in the n-th Round Robin Archive.
 */
RRDRRAFilterAvg.prototype.getRRA = function(idx) {
	if ((idx >= 0) && (idx < this.rra_list.length)) {
		return this.rra_list[idx];
	}
};
