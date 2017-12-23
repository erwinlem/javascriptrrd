"use strict";
/**
 * this class implements all the bindings
 * @constructor
 */
function RRDGraph() {
	this.rrdFiles = [];
}

RRDGraph.prototype.addRrdFile = function(rrdFile) {
	// FIXME: check already exists
	this.rrdFiles.push(rrdFile);
};

RRDGraph.prototype.getFlotData = function() {
	var r = []; 

	var rrd = this.rrdFiles[0];
	for (var ds of rrd.ds) {
		var data = [];
		var x,y;
		var rra;

		// calculate start, end and resolution for each rra
		var rraRange = [];
		for (y = 0; y < rrd.rra.length; y++) { 
			rra = rrd.rra[y];
			rraRange[y] = [
				(rrd.lastUpdate - (rra.nrRows-1)* rra.step)*1000,
				rrd.lastUpdate * 1000,
				rra.step
			];
		}

		// if there is a higher resolution rra change cutoff the lowres one
		for (y = 0; y < rrd.rra.length; y++) { 
			for (x = 0; x < rrd.rra.length; x++) {
				if ((rraRange[y][2] > rraRange[x][2]) &&
					(rraRange[y][1] > rraRange[x][2])) {
					rraRange[y][1] = rraRange[x][0];
				} 
			}
		}

		// push the values into data
		for (y = 0; y < rrd.rra.length; y++) { 
			rra = rrd.rra[y];
			for (x = rra.nrRows-1; x > 0; x--) {
				// FIXME: do this smarter and faster
				var time = (rrd.lastUpdate - (rra.nrRows-1-x) * rra.step) * 1000;
				if (time < rraRange[y][1]) {
					data.push([time, rra.getEl(x,rrd.ds.indexOf(ds))]);
				}
			}
		}
		r.push( { label: ds.name,
			data: data,
			lines: { show:true, fill: true }
		});
	};
	return r;
};

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.RRDGraph = RRDGraph;
} 
