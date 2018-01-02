"use strict";

/**
 * This is the main class of the package. It is also the only class the user
 * ever needs to explicitly instantiate. Given a BinaryFile, gives access to
 * the RRD archive fields. 
 *
 * There will be as little processing as possible and the class will mimic the
 * file as much as possible with the exception of the RRA which will be shifted
 * to the start at 0 (to preserve the sanity of the user).
 * 
 * @constructor
 * @param {BinaryFile} rrd_data must be an object compatible with the BinaryFile interface
 */
function RRDFile(bf) {


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
	};

	// CONSTRUCTOR STARTS HERE 
	this.rrd_data = bf;

	// sanity checks
	if (this.rrd_data.buffer.byteLength < 1) throw "Empty file.";
	if (this.rrd_data.buffer.byteLength < 16) throw "File too short.";

	// figure out alignment & endian and give this to the binary reader 
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

	// LOAD THE HEADER
	// stat_head_t *stat_head; /* the static header */

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
		this.ds[i] = { 
			name : bf.readPaddedString(20),
			type : bf.readPaddedString(20),
			DS_mrhb_cnt : bf.readDouble(),
			DS_min_val : bf.readDouble(),
			DS_max_val : bf.readDouble()
		}
		bf.readNop((10-3)*8);
	}

	// rra_def_t *rra_def; /* list of round robin archive def */
	// load RRA
	for (i = 0; i < this.rra.length; i ++) {
		this.rra[i] = new RRDRRA(this.rrd_data);
	}

	// live_head_t
	// skip time_t, this is very platform specific :(
	this.lastUpdate = this.rrd_data.readLong();

	this.rrd_data.align(this.rrd_data.readAlignLong);
	this.rrd_data.readNop(this.rrd_data.readAlignLong);

	// pdp_prep_t
	for (var ds of this.ds) { 
		ds.last_ds = this.rrd_data.readPaddedString(30);
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
		
	for (var rra of this.rra) {
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

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.RRDFile = RRDFile;
} 
