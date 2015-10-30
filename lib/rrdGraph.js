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

	// FIXME different rra overlay eachother
	var rrd = this.rrdFiles[0];
	for (var dsName of rrd.getDSNames()) {
		var data = [];

		var ds = rrd.getDS(dsName);	
		for (var y = rrd.getNrRRAs()-1; y > 0; y--) { 
			var rra = rrd.getRRA(y);
			for (var x = rra.getNrRows()-1; x > 0; x--) {
				data.push([ 
						(rrd.getLastUpdate() - (rra.getNrRows()-1-x) * rra.getStep()) * 1000.0,
						rra.getEl(x,ds.getIdx())]);
			}
		}
		r.push( { label: dsName,
			data: data,
			lines: { show:true, fill: true }
			});
	}
	return r;


}

if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.rrdGraph = rrdGraph;
} 
