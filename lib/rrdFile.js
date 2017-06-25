/**
 * This class implements the methods needed to access the information about a RRD Data Source.
 * @param {BinaryFile} rrd_data must be an object compatible with the BinaryFile interface
 * @constructor
 */
function RRDDS(rrd_data) {

	/** the name of the data source. 
	 * @member {string} 
	 */
	this.name = rrd_data.readPaddedString(20);
	/** the type of the data source.  
	 * @member {string} 
	 */
	this.type = rrd_data.readPaddedString(20);
	this.DS_mrhb_cnt = rrd_data.readDouble();
	/** the minimum value the data source can contain.  
	 * @member {Number} 
	 */
	this.DS_min_val = rrd_data.readDouble();
	/** the maximum value the data source can contain.  
	 * @member {Number} 
	 */
	this.DS_max_val = rrd_data.readDouble();

	// skip remainder of header
	rrd_data.readNop((10-3)*8);
}

/**
 * This class implements the methods needed to access the content of a Round Robin Archive.
 * @param {BinaryFile} rrd_data must be an object compatible with the BinaryFile interface
 * @constructor
 */
function RRDRRA(rrd_data) {
		/** the Consolidation Function used by the RRA.  
		 * @member {string} */
		this.cf_nam = rrd_data.readPaddedString(20);
		this.nrRows = rrd_data.readLong();
		/** number of slots used for consolidation.  
		 * @member {Number} */
		this.pdp_cnt = rrd_data.readLong();
		rrd_data.align(rrd_data.readAlignDouble);
		rrd_data.readNop(10*8);
}

RRDRRA.prototype = {
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
	this.ds = new Array(this.rrd_data.readLong());
	this.rra = new Array(this.rrd_data.readLong());
	/** the base interval in seconds that was used to feed the RRD file.  
	 * @member {Number} */
	this.pdp_step = this.rrd_data.readLong();

	// do some sanity checks
	if (this.cookie !== "RRD") {
		throw "Wrong magic id.";
	}
	if (!this.version.match("0003|0004|0001")) {
		throw "Unsupported RRD version " + this.version + ".";
	}
	if (this.ds.length < 1) {
		throw "ds count less than 1.";
	}
	if (this.rra.length < 1) {
		throw "rra count ("+this.rra.length+") less than 1.";
	}
	if (this.pdp_step < 1) {
		throw "pdp step less than 1.";
	}

	this.rrd_data.readNop(10*8);

	// best guess, assuming no weird align problems
	this.rrd_data.align(8);
	this.top_header_size = this.rrd_data.filePos;
	var t = this.rrd_data.getLongAt(this.top_header_size);
	if (t === 0) {
		throw "Could not find first DS name.";
	}

	// ds_def_t *ds_def;   /* list of data source definitions */
	// load DS
	var i;
	for (i = 0; i < this.ds.length; i++) {
		this.ds[i] = new RRDDS(this.rrd_data);
	}

	// rra_def_t *rra_def; /* list of round robin archive def */
	// load rra
	for (i = 0; i < this.rra.length; i ++) {
		this.rra[i] = new RRDRRA(this.rrd_data);
	}

	// live_head_t
	// skip time_t, this is very platform specific :(
	this.lastUpdate = this.rrd_data.readLong();

	this.rrd_data.align(this.rrd_data.readAlignLong);
	this.rrd_data.readNop(this.rrd_data.readAlignLong);

	// pdp_prep_t
	for (i = 0; i < this.ds.length; i++) {
		this.ds[i].last_ds = this.rrd_data.readPaddedString(30);
		this.rrd_data.align(4);
		this.rrd_data.readNop(10*8);
	}

	// cdp_prep_t, no clue, just skip
	for (i = 0; i < this.rra.length*this.ds.length; i ++) {
		this.rrd_data.align(4);
		this.rrd_data.readNop(10*8);
	}

	// rra_ptr_t
	for (i = 0; i < this.rra.length; i ++) {
		this.rra[i].cur_row = this.rrd_data.readInt();
	}
		
	for (i = 0; i < this.rra.length; i ++) {
		var rra = this.rra[i];

		rra.step = this.pdp_step * rra.pdp_cnt;
		rra.data = new Array(this.ds.length);

		for (var y = 0; y < this.ds.length; y++) {
			rra.data[y] = new Array(rra.nrRows);
		}

		for (var x = 0; x < rra.nrRows; x++) {
			for (y = 0; y < this.ds.length; y++) {
				// it is round robin, starting from cur_row+1
				rra.data[y][(rra.nrRows + (x - rra.cur_row - 1)) % rra.nrRows] = this.rrd_data.readDouble();
			}
		}
	}
}

RRDFile.prototype = {
	validate_rrd : function() {
		if (this.rrd_data.buffer.byteLength < 1) throw "Empty file.";
		if (this.rrd_data.buffer.byteLength < 16) throw "File too short.";

		this.rrd_data.readAlignDouble = 8; 
		this.rrd_data.readAlignLong = 4;
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
				this.rrd_data.readAlignLong = 8;
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
			this.rrd_data.readAlignDouble = 4; 
		}

	},

	getDSNames : function() {
		var ds_names = [];
		for (var idx = 0; idx < this.ds.length; idx++) {
			ds_names.push(this.ds[idx].name);
		}
		return ds_names;
	},

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
