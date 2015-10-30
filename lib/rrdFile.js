/**
 * This class implements the methods needed to access the information about a RRD Data Source.
 * @constructor
 */
function RRDDS(rrd_data, rrd_data_idx, my_idx) {
	this.rrd_data = rrd_data;
	this.rrd_data_idx = rrd_data_idx;
	this.my_idx = my_idx;
}

/**
 * @return {Number} which DS it is in the RRD file.
 */
RRDDS.prototype.getIdx = function() {
	return this.my_idx;
};

/**
 * @return {string} the name of the data source. 
 */
RRDDS.prototype.getName = function() {
	return this.rrd_data.getCStringAt(this.rrd_data_idx, 20);
};

/**
 * @return {string} the type of the data source. 
 */
RRDDS.prototype.getType = function() {
	return this.rrd_data.getCStringAt(this.rrd_data_idx + 20, 20);
};

/**
 * @return {Number} the minimum value the data source can contain.
 */
RRDDS.prototype.getMin = function() {
	return this.rrd_data.getDoubleAt(this.rrd_data_idx + 48);
};

/**
 * @return {Number} the maximum value the data source can contain.
 */
RRDDS.prototype.getMax = function() {
	return this.rrd_data.getDoubleAt(this.rrd_data_idx + 56);
};

/**
 * This class implements the methods needed to access the information about a Round Robin Archive.
 * @constructor
 */
function RRDRRAInfo(rrd_data, rra_def_idx,
	int_align, row_cnt, pdp_step, my_idx) {
	this.rrd_data = rrd_data;
	this.rra_def_idx = rra_def_idx;
	this.int_align = int_align;
	this.row_cnt = row_cnt;
	this.pdp_step = pdp_step;
	this.my_idx = my_idx;

	// char nam[20], uint row_cnt, uint pdp_cnt
	this.rra_pdp_cnt_idx = rra_def_idx + Math.ceil(20 / int_align) * int_align + int_align;
}

/**
 * @return {Number} which RRA it is in the RRD file. 
 */
RRDRRAInfo.prototype.getIdx = function() {
	return this.my_idx;
};

/**
 * @return {Number} the number of rows in the RRA.
 */
RRDRRAInfo.prototype.getNrRows = function() {
	return this.row_cnt;
};

/**
 * @return {Number} number of slots used for consolidation.
 */
RRDRRAInfo.prototype.getPdpPerRow = function() {
	return this.rrd_data.getLongAt(this.rra_pdp_cnt_idx);
};

/**
 * @return {Number} the number of seconds between rows.
 */
RRDRRAInfo.prototype.getStep = function() {
	return this.pdp_step * this.getPdpPerRow();
};

/**
 * @return {string} the Consolidation Function used by the RRA.
 */
RRDRRAInfo.prototype.getCFName = function() {
	return this.rrd_data.getCStringAt(this.rra_def_idx, 20);
};


/**
 * This class implements the methods needed to access the content of a Round Robin Archive.
 * @constructor
 */
function RRDRRA(rrd_data, rra_ptr_idx,
	rra_info,
	header_size, prev_row_cnts, ds_cnt) {
	this.rrd_data = rrd_data;
	this.rra_info = rra_info;
	this.row_cnt = rra_info.row_cnt;
	this.ds_cnt = ds_cnt;
	this.row_size = ds_cnt * 8;
	this.base_rrd_db_idx = header_size + prev_row_cnts * this.row_size;

	// get imediately, since it will be needed often
	this.cur_row = rrd_data.getLongAt(rra_ptr_idx);
}

/** 
 * calculate idx relative to base_rrd_db_idx
 * mostly used internally
 * @private
 */
RRDRRA.prototype.calc_idx = function(row_idx, ds_idx) {
	// do range check
	if ((row_idx < 0) || (row_idx >= this.row_cnt)) {
		throw RangeError("Row idx (" + row_idx + ") out of range [0-" + this.row_cnt + ").");
	}

	if ((ds_idx < 0) || (ds_idx >= this.ds_cnt)) {
		throw RangeError("DS idx (" + row_idx + ") out of range [0-" + this.ds_cnt + ").");
	}
	// it is round robin, starting from cur_row+1
	var real_row_idx = (row_idx + this.cur_row + 1) % this.row_cnt;
	return this.row_size * real_row_idx + ds_idx * 8;
};

/**
 * @return {Number} which RRA it is in the RRD file. 
 */
RRDRRA.prototype.getIdx = function() {
	return this.rra_info.getIdx();
};

/**
 * @return {Number} the number of rows in the RRA.
 */
RRDRRA.prototype.getNrRows = function() {
	return this.row_cnt;
};

/**
 * @return {Number} the number of Data Sources present in the RRA.
 */
RRDRRA.prototype.getNrDSs = function() {
	return this.ds_cnt;
};

/**
 * @return {Number} the number of seconds between rows.
 */
RRDRRA.prototype.getStep = function() {
	return this.rra_info.getStep();
};

/**
 * The current implementation only supports AVERAGE,MAXIMUM,MINIMUM and LAST.
 * Access to elements of any other CF is currently undefined.
 *
 * @return {string} the Consolidation Function used by the RRA.
 */
RRDRRA.prototype.getCFName = function() {
	return this.rra_info.getCFName();
};

/**
 * @param {number} row_idx row
 * @param {number} ds_idx ds
 * @return {Number} the value for the d-th DS in the r-th row.
 */
RRDRRA.prototype.getEl = function(row_idx, ds_idx) {
	return this.rrd_data.getDoubleAt(this.base_rrd_db_idx + this.calc_idx(row_idx, ds_idx));
};

// ============================================================
// RRD Header handling class
function RRDHeader(rrd_data) {
	this.rrd_data = rrd_data;
	this.validate_rrd();
	this.calc_idxs();
}

// Internal, used for initialization
RRDHeader.prototype.validate_rrd = function() {
	if (this.rrd_data.getLength() < 1) throw "Empty file.";
	if (this.rrd_data.getLength() < 16) throw "File too short.";
	if (this.rrd_data.getCStringAt(0, 4) !== "RRD") throw "Wrong magic id.";

	this.rrd_version = this.rrd_data.getCStringAt(4, 5);
	if (!this.rrd_version.match("0003|0004|0001")) {
		throw "Unsupported RRD version " + this.rrd_version + ".";
	}

	var float_align = 8;
	this.int_align = 4;
	this.int_width = 4;
	if (this.rrd_data.getLongAt(12) === 0) {
		// not a double here... likely 64 bit
		float_align = 8;
		if (this.rrd_data.getDoubleAt(16) != 8.642135e+130) {
			// uhm... wrong endian?
			this.rrd_data.switch_endian = true;
		}

		if (this.rrd_data.getDoubleAt(16) != 8.642135e+130) {
			throw "Magic float not found at 16.";
		}

		// now, is it all 64bit or only float 64 bit?
		if (this.rrd_data.getLongAt(28) === 0) {
			// true 64 bit align
			this.int_align = 8;
			this.int_width = 8;
		}
	} else {
		/// should be 32 bit alignment
		if (this.rrd_data.getDoubleAt(12) != 8.642135e+130) {
			// uhm... wrong endian?
			this.rrd_data.switch_endian = true;
		}
		if (this.rrd_data.getDoubleAt(12) != 8.642135e+130) {
			throw "Magic float not found at 12.";
		}
		float_align = 4;
	}
	this.unival_width = 8;
	this.unival_align = float_align;

	// process the header here, since I need it for validation

	// char magic[4], char version[5], double magic_float

	// long ds_cnt, long rra_cnt, long pdp_step, unival par[10]
	this.ds_cnt_idx = Math.ceil((4 + 5) / this.unival_align) * this.unival_align + this.unival_width;
	this.rra_cnt_idx = this.ds_cnt_idx + this.int_width;
	this.pdp_step_idx = this.rra_cnt_idx + this.int_width;

	//always get only the low 32 bits, the high 32 on 64 bit archs should always be 0
	this.ds_cnt = this.rrd_data.getLongAt(this.ds_cnt_idx);
	if (this.ds_cnt < 1) {
		throw "ds count less than 1.";
	}

	this.rra_cnt = this.rrd_data.getLongAt(this.rra_cnt_idx);
	if (this.ds_cnt < 1) {
		throw "rra count less than 1.";
	}

	this.pdp_step = this.rrd_data.getLongAt(this.pdp_step_idx);
	if (this.pdp_step < 1) {
		throw "pdp step less than 1.";
	}

	// best guess, assuming no weird align problems
	this.top_header_size = Math.ceil((this.pdp_step_idx + this.int_width) / this.unival_align) * this.unival_align + 10 * this.unival_width;
	var t = this.rrd_data.getLongAt(this.top_header_size);
	if (t === 0) {
		throw "Could not find first DS name.";
	}
};

// Internal, used for initialization
RRDHeader.prototype.calc_idxs = function() {
	this.ds_def_idx = this.top_header_size;
	// char ds_nam[20], char dst[20], unival par[10]
	this.ds_el_size = Math.ceil((20 + 20) / this.unival_align) * this.unival_align + 10 * this.unival_width;

	this.rra_def_idx = this.ds_def_idx + this.ds_el_size * this.ds_cnt;
	// char cf_nam[20], uint row_cnt, uint pdp_cnt, unival par[10]
	this.row_cnt_idx = Math.ceil(20 / this.int_align) * this.int_align;
	this.rra_def_el_size = Math.ceil((this.row_cnt_idx + 2 * this.int_width) / this.unival_align) * this.unival_align + 10 * this.unival_width;

	this.live_head_idx = this.rra_def_idx + this.rra_def_el_size * this.rra_cnt;
	// time_t last_up, int last_up_usec
	this.live_head_size = 2 * this.int_width;

	this.pdp_prep_idx = this.live_head_idx + this.live_head_size;
	// char last_ds[30], unival scratch[10]
	this.pdp_prep_el_size = Math.ceil(30 / this.unival_align) * this.unival_align + 10 * this.unival_width;

	this.cdp_prep_idx = this.pdp_prep_idx + this.pdp_prep_el_size * this.ds_cnt;
	// unival scratch[10]
	this.cdp_prep_el_size = 10 * this.unival_width;

	this.rra_ptr_idx = this.cdp_prep_idx + this.cdp_prep_el_size * this.ds_cnt * this.rra_cnt;
	// uint cur_row
	this.rra_ptr_el_size = 1 * this.int_width;

	this.header_size = this.rra_ptr_idx + this.rra_ptr_el_size * this.rra_cnt;
};

// Optional initialization
// Read and calculate row counts
RRDHeader.prototype.load_row_cnts = function() {
	this.rra_def_row_cnts = [];
	this.rra_def_row_cnt_sums = []; // how many rows before me
	for (var i = 0; i < this.rra_cnt; i++) {
		this.rra_def_row_cnts[i] = this.rrd_data.getLongAt(this.rra_def_idx + i * this.rra_def_el_size + this.row_cnt_idx, false);
		if (i === 0) {
			this.rra_def_row_cnt_sums[i] = 0;
		} else {
			this.rra_def_row_cnt_sums[i] = this.rra_def_row_cnt_sums[i - 1] + this.rra_def_row_cnts[i - 1];
		}
	}
};

// ---------------------------
// Start of user functions

RRDHeader.prototype.getMinStep = function() {
	return this.pdp_step;
};
RRDHeader.prototype.getLastUpdate = function() {
	return this.rrd_data.getLongAt(this.live_head_idx, false);
};

RRDHeader.prototype.getNrDSs = function() {
	return this.ds_cnt;
};
RRDHeader.prototype.getDSNames = function() {
	var ds_names = [];
	for (var idx = 0; idx < this.ds_cnt; idx++) {
		var ds = this.getDSbyIdx(idx);
		var ds_name = ds.getName();
		ds_names.push(ds_name);
	}
	return ds_names;
};

RRDHeader.prototype.getDSbyIdx = function(idx) {
	if ((idx < 0) || (idx >= this.ds_cnt)) {
		throw RangeError("DS idx (" + idx + ") out of range [0-" + this.ds_cnt + ").");
	}
	return new RRDDS(this.rrd_data, this.ds_def_idx + this.ds_el_size * idx, idx);
};

RRDHeader.prototype.getDSbyName = function(name) {
	for (var idx = 0; idx < this.ds_cnt; idx++) {
		var ds = this.getDSbyIdx(idx);
		if (name == ds.getName())
			return ds;
	}
	throw RangeError("DS name " + name + " unknown.");
};

RRDHeader.prototype.getNrRRAs = function() {
	return this.rra_cnt;
};

RRDHeader.prototype.getRRAInfo = function(idx) {
	if ((idx < 0) || (idx >= this.rra_cnt)) {
		throw RangeError("RRA idx (" + idx + ") out of range [0-" + this.rra_cnt + ").");
	}

	return new RRDRRAInfo(this.rrd_data,
			this.rra_def_idx + idx * this.rra_def_el_size,
			this.int_align, this.rra_def_row_cnts[idx], this.pdp_step,
			idx);
};

/**
 * This is the main class of the package. It is also the only class the user ever needs to explicitly instantiate. Given a BinaryFile, gives access to the RRD archive fields
 * 
 * @constructor
 * @param {BinaryFile} bf must be an object compatible with the BinaryFile interface
 */
function RRDFile(bf) {
	this.bf = bf;
	// FIXME use dataview
	this.rrd_header = new RRDHeader(bf); // FIXME and don't pass the crap around
	this.rrd_header.load_row_cnts();
}

/**
 * @return {Number} the base interval in seconds that was used to feed the RRD file. 
 */
RRDFile.prototype.getMinStep = function() {
	return this.rrd_header.getMinStep();
};
/**
 * @return {Number} the timestamp of the last update. 
 */
RRDFile.prototype.getLastUpdate = function() {
	return this.rrd_header.getLastUpdate();
};

/**
 * @return {Number} the number of Data Sources present in the RRD file.
 */
RRDFile.prototype.getNrDSs = function() {
	return this.rrd_header.getNrDSs();
};
/**
 * @return {Number} the names of the Data Sources present in the RRD file. 
 */
RRDFile.prototype.getDSNames = function() {
	return this.rrd_header.getDSNames();
};
/**
 * @return {Number} If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.
 *
 * If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
 */
RRDFile.prototype.getDS = function(id) {
	if (typeof id == "number") {
		return this.rrd_header.getDSbyIdx(id);
	} else {
		return this.rrd_header.getDSbyName(id);
	}
};

/**
 * @return {Number}  the number of Round Robin Archives present in the RRD file. 
 */
RRDFile.prototype.getNrRRAs = function() {
	return this.rrd_header.getNrRRAs();
};

/**
 * @return {Number} an object of type RRDRRAInfo holding the information about the n-th Round Robin Archive.
 */
RRDFile.prototype.getRRAInfo = function(idx) {
	return this.rrd_header.getRRAInfo(idx);
};

/**
 * @return {Number} an object of type RRDRRA that can be used to access the values stored in the n-th Round Robin Archive. 
 */
RRDFile.prototype.getRRA = function(idx) {
	rra_info = this.rrd_header.getRRAInfo(idx);
	return new RRDRRA(this.bf,
		this.rrd_header.rra_ptr_idx + idx * this.rrd_header.rra_ptr_el_size,
		rra_info,
		this.rrd_header.header_size,
		this.rrd_header.rra_def_row_cnt_sums[idx],
		this.rrd_header.ds_cnt);
};

if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.RRDFile = RRDFile;
} 
