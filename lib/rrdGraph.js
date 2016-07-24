/**
 * this class implements all the bindings
 * @constructor
 */
function rrdGraph() {
	this.rrdFiles = [];
};

rrdGraph.prototype.addRrdFile = function(rrdFile) {
	// FIXME: check already exists
	this.rrdFiles.push(rrdFile);
}

rrdGraph.prototype.getFlotData = function() {
	var r = []; 

	var rrd = this.rrdFiles[0];
	$.each(rrd.getDSNames(), function (key,value) {
		var data = [];
		var x,y;
		var ds = rrd.getDS(value);	

		// calculate start, end and resolution for each rra
		var rraRange = [];
		for (y = 0; y < rrd.getNrRRAs(); y++) { 
			var rra = rrd.getRRA(y);
			rraRange[y] = [
				(rrd.getLastUpdate() - (rra.nrRows-1)* rra.rra_info.step)*1000.,
				rrd.getLastUpdate() * 1000.,
				rra.rra_info.step
			];
		}

		// if there is a higher resolution rra change cutoff the lowres one
		for (y = 0; y < rrd.getNrRRAs(); y++) { 
			for (x = 0; x < rrd.getNrRRAs(); x++) {
				if ((rraRange[y][2] > rraRange[x][2]) &&
					(rraRange[y][1] > rraRange[x][2])) {
					rraRange[y][1] = rraRange[x][0];
				} 
			}
		}

		// push the values into data
		for (y = 0; y < rrd.getNrRRAs(); y++) { 
			var rra = rrd.getRRA(y);
			for (x = rra.nrRows-1; x > 0; x--) {
				// FIXME: do this smarter and faster
				var time = (rrd.getLastUpdate() - (rra.nrRows-1-x) * rra.rra_info.step) * 1000.;
				if (time < rraRange[y][1]) {
					data.push([time, rra.getEl(x,ds.my_idx)]);
				}
			}
		}
		r.push( { label: value,
			data: data,
			lines: { show:true, fill: true }
		});
	});
	return r;


}

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.rrdGraph = rrdGraph;
} 
