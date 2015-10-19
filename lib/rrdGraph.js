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

	for (var dsName of this.rrdFiles[0].getDSNames()) {
		var data = [];
		for (var x = 575; x > 0; x--) {
			var rrd = this.rrdFiles[0];
			var ds = rrd.getDS(dsName);	
			var rra = rrd.getRRA(2);
			data.push([ 
				(rrd.getLastUpdate() - (rra.getNrRows()-1+x) * rra.getStep()) * 1000.0,
				rra.getEl(x,ds.getIdx())]);
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
