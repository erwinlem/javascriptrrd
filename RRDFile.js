/*jslint esversion:6*/
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
 */
function RRDFile(bf) {

	// sanity checks
	if (bf.buffer.byteLength < 1) throw "Empty file.";
	if (bf.buffer.byteLength < 16) throw "File too short.";

	// figure out alignment & endian and give this to the binary reader 
	bf.readAlignDouble = 8; 
	bf.readAlignLong = 4;
	if (bf.getLongAt(12) === 0) {
		// not a double here... likely 64 bit
		if (bf.getDoubleAt(16) != 8.642135e+130) {
			// uhm... wrong endian?
			bf.switch_endian = true;
		}

		if (bf.getDoubleAt(16) != 8.642135e+130) {
			throw "Magic float not found at 16.";
		}

		// now, is it all 64bit or only float 64 bit?
		if (bf.getLongAt(28) === 0) {
			// true 64 bit align
			bf.readAlignLong = 8;
		}
	} else {
		// should be 32 bit alignment
		if (bf.getDoubleAt(12) != 8.642135e+130) {
			// uhm... wrong endian?
			bf.switch_endian = true;
		}
		if (bf.getDoubleAt(12) != 8.642135e+130) {
			throw "Magic float not found at 12.";
		}
		bf.readAlignDouble = 4; 
	}

	// LOAD THE HEADER
	// stat_head_t *stat_head; /* the static header */

	// header is described in the rrd_format.h https://github.com/oetiker/rrdtool-1.x/blob/master/src/rrd_format.h
	var cookie = bf.readString();
	this.version = bf.readString();
	var float_cookie = bf.readDouble();
	this.ds = new Array(bf.readLong());
	this.rra = new Array(bf.readLong());
	var pdp_step = bf.readLong();

	// do some sanity checks
	if (cookie !== "RRD") {
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
	if (pdp_step < 1) {
		throw "pdp step less than 1.";
	}

	bf.readNop(10*8);

	// best guess, assuming no weird align problems
	bf.align(8);
	var top_header_size = bf.filePos;
	var t = bf.getLongAt(top_header_size);
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
		};
		bf.readNop((10-3)*8);
	}

	// rra_def_t *rra_def; /* list of round robin archive def */
	// load RRA
	for (i = 0; i < this.rra.length; i ++) {
		this.rra[i] = {
			cf_nam : bf.readPaddedString(20),
			nrRows : bf.readLong(),
			pdp_cnt : bf.readLong()
		};
		bf.align(bf.readAlignDouble);
		bf.readNop(10*8);
	}

	// live_head_t
	// skip time_t, this is very platform specific :(
	this.lastUpdate = bf.readLong();

	bf.align(bf.readAlignLong);
	bf.readNop(bf.readAlignLong);

	// pdp_prep_t
	for (var ds of this.ds) { 
		ds.last_ds = bf.readPaddedString(30);
		bf.align(4);
		bf.readNop(10*8);
	}

	// cdp_prep_t, no clue, just skip
	for (i = 0; i < this.rra.length*this.ds.length; i ++) {
		bf.align(4);
		bf.readNop(10*8);
	}

	// rra_ptr_t
	for (i = 0; i < this.rra.length; i ++) {
		this.rra[i].cur_row = bf.readInt();
	}
		
	for (var rra of this.rra) {
		rra.step = pdp_step * rra.pdp_cnt;
		rra.data = new Array(this.ds.length);

		for (var y = 0; y < this.ds.length; y++) {
			rra.data[y] = new Array(rra.nrRows);
		}

		for (var x = 0; x < rra.nrRows; x++) {
			for (y = 0; y < this.ds.length; y++) {
				// it is round robin, starting from cur_row+1
				rra.data[y][(rra.nrRows + (x - rra.cur_row - 1)) % rra.nrRows] = bf.readDouble();
			}
		}
	}
}

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.RRDFile = RRDFile;
} 
