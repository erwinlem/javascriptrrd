/**
 * Combine multiple rrdFiles into one object
 * It implements the same interface, but changing the content
 * This class implements the same interface as RRDRRA.
 * @constructor
 */
function RRDRRASum(rra_list, offset_list, treat_undefined_as_zero) {
	this.rra_list = rra_list;
	this.offset_list = offset_list;
	this.treat_undefined_as_zero = treat_undefined_as_zero;
	this.row_cnt = this.rra_list[0].getNrRows();
}

RRDRRASum.prototype.getIdx = function() {
	return this.rra_list[0].getIdx();
};

/**
 * @return {number}  Get number of rows/columns
 */
RRDRRASum.prototype.getNrRows = function() {
	return this.row_cnt;
};

RRDRRASum.prototype.getNrDSs = function() {
	return this.rra_list[0].getNrDSs();
};

/**
 * @return {Number} Get RRA step (expressed in seconds)
 */
RRDRRASum.prototype.getStep = function() {
	return this.rra_list[0].getStep();
};

/**
 * @return {string}  Get consolidation function name
 */
RRDRRASum.prototype.getCFName = function() {
	return this.rra_list[0].getCFName();
};

RRDRRASum.prototype.getEl = function(row_idx, ds_idx) {
	var outSum = 0.0;
	for (var i in this.rra_list) {
		var offset = this.offset_list[i];
		if ((row_idx + offset) < this.row_cnt) {
			var rra = this.rra_list[i];
			val = rra.getEl(row_idx + offset, ds_idx);
		} else {
			/* out of row range -> undefined*/
			val = undefined;
		}
		/* treat all undefines as 0 for now */
		if (val === undefined) {
			if (this.treat_undefined_as_zero) {
				val = 0;
			} else {
				/* if even one element is undefined, the whole sum is undefined */
				outSum = undefined;
				break;
			}
		}
		outSum += val;
	}
	return outSum;
};

/**
 * Low precision version of getEl. Uses getFastDoubleAt
 */
RRDRRASum.prototype.getElFast = function(row_idx, ds_idx) {
	var outSum = 0.0;
	for (var i in this.rra_list) {
		var offset = this.offset_list[i];
		if ((row_id + offset) < this.row_cnt) {
			var rra = this.rra_list[i];
			val = rra.getElFast(row_idx + offset, ds_idx);
		} else {
			/* out of row range -> undefined*/
			val = undefined;
		}
		/* treat all undefines as 0 for now */
		if (val === undefined) {
			if (this.treat_undefined_as_zero) {
				val = 0;
			} else {
				/* if even one element is undefined, the whole sum is undefined */
				outSum = undefined;
				break;
			}
		}
		outSum += val;
	}
	return outSum;
};

/**
 * INTERNAL
 * sort by lastupdate, descending 
 */
function rrdFileSort(f1, f2) {
	return f2.getLastUpdate() - f1.getLastUpdate();
}

/**
 * Sum several RRDfiles together
 * They must all have the same DSes and the same RRAs
 *
 * @param file_list A list of similar RRDFile objects. They must all have the same DSes and the same RRAs.
 * @param sumfile_options An options object - If defined, it can contain any of the following: treat_undefined_as_zero - This value defines how to treat undefined values. If true (or undefined), they are counted as zeros and the sum will always succeed. If it is false, any undefined value in one of the input objects will result in the sum being marked as undefined.
 * @constructor
 */
function RRDFileSum(file_list, sumfile_options) {
	if (sumfile_options === undefined || sumfile_options === null) {
		sumfile_options = {};
	} else if (typeof(sumfile_options) == "boolean") {
		sumfile_options = {
			treat_undefined_as_zero: sumfile_options
		};
	}
	this.sumfile_options = sumfile_options;


	if (this.sumfile_options.treat_undefined_as_zero === undefined) {
		this.treat_undefined_as_zero = true;
	} else {
		this.treat_undefined_as_zero = this.sumfile_options.treat_undefined_as_zero;
	}
	this.file_list = file_list;
	this.file_list.sort();
}

RRDFileSum.prototype.getMinStep = function() {
	return this.file_list[0].getMinStep();
};

RRDFileSum.prototype.getLastUpdate = function() {
	return this.file_list[0].getLastUpdate();
};

RRDFileSum.prototype.getNrDSs = function() {
	return this.file_list[0].getNrDSs();
};

RRDFileSum.prototype.getDSNames = function() {
	return this.file_list[0].getDSNames();
};

RRDFileSum.prototype.getDS = function(id) {
	return this.file_list[0].getDS(id);
};

RRDFileSum.prototype.getNrRRAs = function() {
	return this.file_list[0].getNrRRAs();
};

RRDFileSum.prototype.getRRAInfo = function(idx) {
	return this.file_list[0].getRRAInfo(idx);
};

RRDFileSum.prototype.getRRA = function(idx) {
	var rra_info = this.getRRAInfo(idx);
	var rra_step = rra_info.getStep();
	var realLastUpdate;

	var rra_list = [];
	var offset_list = [];
	for (var i in this.file_list) {
		file = this.file_list[i];
		fileLastUpdate = file.getLastUpdate();
		if (realLastUpdate !== undefined) {
			fileSkrew = Math.floor((realLastUpdate - fileLastUpdate) / rra_step);
		} else {
			fileSkrew = 0;
			firstLastUpdate = fileLastUpdate;
		}
		offset_list.push(fileSkrew);
		fileRRA = file.getRRA(idx);
		rra_list.push(fileRRA);
	}

	return new RRDRRASum(rra_list, offset_list, this.treat_undefined_as_zero);
};
