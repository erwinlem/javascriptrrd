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



