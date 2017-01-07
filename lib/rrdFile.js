/**
 * get alined data
 */
function align(s,b) {
	return Math.ceil(s/b)*b;
}

/**
 * This class implements the methods needed to access the information about a RRD Data Source.
 * @constructor
 */
function RRDDS(rrd_data, my_idx) {
	this.my_idx = my_idx;

	/** @type {string} the name of the data source.  */
	this.name = rrd_data.readPaddedString(20);
	/** @type {string} the type of the data source.  */
	this.type = rrd_data.readPaddedString(20);
	this.DS_mrhb_cnt = rrd_data.readDouble();
	/** @type {Number} the minimum value the data source can contain.  */
	this.DS_min_val = rrd_data.readDouble();
	/** @type {Number} the maximum value the data source can contain.  */
	this.DS_max_val = rrd_data.readDouble();

	// skip remainder of header
	rrd_data.readNop((10-3)*8);
}

/**
 * This class implements the methods needed to access the content of a Round Robin Archive.
 * @constructor
 */
function RRDRRA() {
}

RRDRRA.prototype = {
	loadRra_Def : function(rrd_data) {
		/** @type {string} the Consolidation Function used by the RRA.  */
		this.cf_nam = rrd_data.readPaddedString(20);
		this.row_cnt = rrd_data.readLong();
		/** @type {Number} number of slots used for consolidation.  */
		this.pdp_cnt = rrd_data.readLong();
		rrd_data.align(rrd_data.readAlignDouble);
		rrd_data.readNop(10*8);
	},

	/**
	 * @param {number} row_idx row
	 * @param {number} ds_idx ds
	 * @return {Number} the value for the d-th DS in the r-th row.
	 */
	getEl : function(row_idx, ds_idx) {
		return this.data[ds_idx][row_idx];
	}

};

/**
 * This is the main class of the package. It is also the only class the user ever needs to explicitly instantiate. Given a BinaryFile, gives access to the RRD archive fields
 * 
 * @constructor
 * @param {BinaryFile} rrd_data must be an object compatible with the BinaryFile interface
 */
function RRDFile(bf) {
	this.rrd_data = bf;
	this.validate_rrd();

	// stat_head_t *stat_head; /* the static header */
	// process the header here, since I need it for validation

	// header is described in the rrd_format.h https://github.com/oetiker/rrdtool-1.x/blob/master/src/rrd_format.h
	this.cookie = this.rrd_data.readString();
	this.version = this.rrd_data.readString();
	this.float_cookie = this.rrd_data.readDouble();
	this.ds_cnt = this.rrd_data.readLong();
	this.rra_cnt = this.rrd_data.readLong();
	this.pdp_step = this.rrd_data.readLong();

	// do some sanity checks
	if (this.cookie !== "RRD") {
		throw "Wrong magic id.";
	}
	if (!this.version.match("0003|0004|0001")) {
		throw "Unsupported RRD version " + this.version + ".";
	}
	if (this.ds_cnt < 1) {
		throw "ds count less than 1.";
	}
	if (this.rra_cnt < 1) {
		throw "rra count ("+this.rra_cnt+") less than 1.";
	}
	if (this.pdp_step < 1) {
		throw "pdp step less than 1.";
	}

	this.rrd_data.readNop(10*8);

	// best guess, assuming no weird align problems
	this.rrd_data.align(this.unival_width);
	this.top_header_size = this.rrd_data.filePos;
	var t = this.rrd_data.getLongAt(this.top_header_size);
	if (t === 0) {
		throw "Could not find first DS name.";
	}

	this.calc_idxs();

	// ds_def_t *ds_def;   /* list of data source definitions */
	// load DS
	var i;
	for (i = 0; i < this.ds_cnt; i++) {
		this.ds[i] = new RRDDS(this.rrd_data, i);
	}

	// rra_def_t *rra_def; /* list of round robin archive def */
	// load rra
	for (i = 0; i < this.rra_cnt; i ++) {
		this.rra[i] = new RRDRRA();
		this.rra[i].loadRra_Def(this.rrd_data);
	}

	// live_head_t
	// skip time_t, this is very platform specific :(
	this.lastUpdate = this.rrd_data.readLong();
	this.rrd_data.align(this.int_width);
	this.rrd_data.readNop(this.int_width);

	// pdp_prep_t
	for (i = 0; i < this.ds_cnt; i++) {
		this.ds[i].last_ds = this.rrd_data.readPaddedString(30);
		this.rrd_data.align(4);
		this.rrd_data.readNop(10*8);
	}

	// cdp_prep_t, no clue, just skip
	for (i = 0; i < this.rra_cnt*this.ds_cnt; i ++) {
		this.rrd_data.align(4);
		this.rrd_data.readNop(10*8);
	}

	// rra_ptr_t
	for (i = 0; i < this.rra_cnt; i ++) {
		this.rra[i].cur_row = this.rrd_data.readInt();
	}

	this.rra_def_row_cnt_sums = []; // how many rows before me
	for (var i = 0; i < this.rra_cnt; i++) {
		this.rra[i].nrRows = this.rrd_data.getLongAt(this.rra_def_idx + i * this.rra_def_el_size + this.row_cnt_idx, false);
		if (i === 0) {
			this.rra_def_row_cnt_sums[i] = 0;
		} else {
			this.rra_def_row_cnt_sums[i] = this.rra_def_row_cnt_sums[i - 1] + this.rra[i-1].nrRows;
		}
	}


	for (i = 0; i < this.rra_cnt; i ++) {
		var rra = this.rra[i];

		/** @type {Number} the number of seconds between rows.  */
		rra.step = this.pdp_step * rra.pdp_cnt;
		/** @type {Number} the number of Data Sources present in the RRA.  */
		rra.base_rrd_db_idx = this.header_size + this.rra_def_row_cnt_sums[i] * this.ds_cnt * 8;

		rra.data = new Array(this.ds_cnt);

		for (var y = 0; y < this.ds_cnt; y++) {
			rra.data[y] = new Array(rra.nrRows);
			for (var x = 0; x < rra.nrRows; x++) {
				// it is round robin, starting from cur_row+1
				rra.data[y][x] = this.rrd_data.getDoubleAt(rra.base_rrd_db_idx + (this.ds_cnt * ((x + rra.cur_row + 1) % rra.nrRows) + y) * 8);
			}
		}
	}


}

RRDFile.prototype = {
	rra : [],
	ds : [],
	validate_rrd : function() {
		if (this.rrd_data.buffer.byteLength < 1) throw "Empty file.";
		if (this.rrd_data.buffer.byteLength < 16) throw "File too short.";

		var float_align = 8;
		this.int_width = 4;
		if (this.rrd_data.getLongAt(12) === 0) {
			// not a double here... likely 64 bit
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

		// fix alignment
		this.rrd_data.readAlignLong = this.int_width;
		this.rrd_data.readAlignDouble = float_align; 

	},

	calc_idxs : function() {
		this.ds_def_idx = this.top_header_size;
		// char ds_nam[20], char dst[20], unival par[10]
		this.ds_el_size = 40 + 10 * this.unival_width;

		this.rra_def_idx = this.ds_def_idx + this.ds_el_size * this.ds_cnt;
		// char cf_nam[20], uint row_cnt, uint pdp_cnt, unival par[10]
		this.row_cnt_idx = align(20, this.int_width);
		this.rra_def_el_size = Math.ceil((this.row_cnt_idx + 2 * this.int_width) / this.unival_align) * this.unival_align + 10 * this.unival_width;

		this.live_head_idx = this.rra_def_idx + this.rra_def_el_size * this.rra_cnt;
		// time_t last_up, int last_up_usec
		this.live_head_size = 2 * this.int_width;

		this.pdp_prep_idx = this.live_head_idx + this.live_head_size;
		// char last_ds[30], unival scratch[10]
		this.pdp_prep_el_size = align(30, this.unival_align) + 10 * this.unival_width;

		this.cdp_prep_idx = this.pdp_prep_idx + this.pdp_prep_el_size * this.ds_cnt;
		// unival scratch[10]
		this.cdp_prep_el_size = 10 * this.unival_width;

		this.rra_ptr_idx = this.cdp_prep_idx + this.cdp_prep_el_size * this.ds_cnt * this.rra_cnt;
		// uint cur_row
		this.rra_ptr_el_size = 1 * this.int_width;

		this.header_size = this.rra_ptr_idx + this.rra_ptr_el_size * this.rra_cnt;
	},

	/**
	 *  
	 * @return {Number} the base interval in seconds that was used to feed the RRD file. 
	 */
	getMinStep : function() {
		return this.pdp_step;
	},

	/**
	 *  
	 */
	getDSNames : function() {
		var ds_names = [];
		for (var idx = 0; idx < this.ds_cnt; idx++) {
			ds_names.push(this.ds[idx].name);
		}
		return ds_names;
	},

	/**
	 *  
	 * 
	 * @param name 
	 */
	getDSbyName : function(name) {
		for (var idx = 0; idx < this.ds.length; idx++) {
			if (this.ds[idx].name == name)
				return this.ds[idx];
		}
		throw RangeError("DS name " + name + " unknown.");
	},

	/**
	 * @return {Number} If id is a number, return an object of type RRDDS holding the information about the id-th Data Source.
	 *
	 * If id is a string, return an object of type RRDDS holding the information about the Data Source with the requested name.
	 */
	getDS : function(id) {
		if (typeof id == "number") {
			return this.ds[id];
		} else {
			return this.getDSbyName(id);
		}
	}

};

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.RRDFile = RRDFile;
} 
