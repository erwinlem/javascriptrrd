function rrdFlotAsyncCallback(bf, obj) {
	var i_rrd_data;
	i_rrd_data = new RRDFile(bf, obj.file_options);
	
	if (i_rrd_data !== undefined) {
		if (obj.rrd_data !== null) delete obj.rrd_data;
		obj.rrd_data = i_rrd_data;
		obj.callback();
	}
}

/**
 * This class creates a graph out of single file.
 * Once instantiated, the object will automatically draw the plot and handle user interaction.
 * @param html_id ID of a HTML element, possibly a div.
 * @param url A string pointing to the file to load.
 * @param file_options (optional) See RRDFile constructor for details.
 * @param graph_options (optional) See rrdFlot constructor for details.
 * @param ds_graph_options (optional)
 * @param rrdflot_defaults (optional)
 * @param ds_op_list (optional) If present, will wrap the data in RRDFilterOp
 * @param rrd_op_list (optional) If present, will wrap the data in RRDRRAFilterAvg
 * @param customization_callback (optional) If present, will be called after the data has been loaded and before the graph is drawn
 * @constructor
 */
function rrdFlotAsync(html_id, url, file_options, graph_options, ds_graph_options, rrdflot_defaults, ds_op_list, rra_op_list, customization_callback) {
	this.html_id = html_id;
	this.url = url;
	this.file_options = file_options;
	this.graph_options = graph_options;
	this.ds_graph_options = ds_graph_options;
	this.rrdflot_defaults = rrdflot_defaults;
	this.ds_op_list = ds_op_list;
	this.rra_op_list = rra_op_list;

	this.customization_callback = customization_callback;

	this.rrd_flot_obj = null;
	this.rrd_data = null;

	if (url !== null) {
		this.reload(url);
	}
}

rrdFlotAsync.prototype.reload = function(url) {
	this.url = url;
	FetchBinaryURLAsync(url, rrdFlotAsyncCallback, this);
};

rrdFlotAsync.prototype.callback = function() {
	if (this.rrd_flot_obj !== null) delete this.rrd_flot_obj;

	if (this.customization_callback !== undefined) this.customization_callback(this);

	var irrd_data = this.rrd_data;
	if (this.ds_op_list !== undefined && this.ds_op_list !== null) irrd_data = new RRDFilterOp(irrd_data, this.ds_op_list);
	if (this.rra_op_list !== undefined && this.rra_op_list !== null) irrd_data = new RRDRRAFilterAvg(irrd_data, this.rra_op_list);
	this.rrd_flot_obj = new rrdFlot(this.html_id, irrd_data, this.graph_options, this.ds_graph_options, this.rrdflot_defaults);
};


function rrdFlotMultiAsyncCallback(bf, arr) {
	var obj = arr[0];
	var idx = arr[1];

	obj.files_loaded++; // increase this even if it fails later on, else we will never finish

	var i_rrd_data;
	i_rrd_data = new RRDFile(bf, obj.file_options);

	if (i_rrd_data !== undefined) {
		obj.loaded_data[idx] = i_rrd_data;
	}

	if (obj.files_loaded == obj.files_needed) {
		obj.callback();
	}
}

/* Another internal helper function */
function rrdFlotMultiAsyncReload(obj, url_list) {
	obj.files_needed = url_list.length;
	obj.url_list = url_list;
	delete obj.loaded_data;
	obj.loaded_data = [];
	obj.files_loaded = 0;
	for (var i in url_list) {
		try {
			FetchBinaryURLAsync(url_list[i], rrdFlotMultiAsyncCallback, [obj, i]);
		} catch (err) {
			alert("Failed loading " + url_list[i] + ". You may get a partial result in the graph.\n" + err);
			obj.files_needed--;
		}
	}
}

/**
 * This class creates a graph out of a set of files, using RRDFileSum to glue them together.
 * Once instantiated, the object will automatically draw the plot and handle user interaction.
 * @param html_id ID of a HTML element, possibly a div.
 * @param url_list A list of strings pointing to the files to load. Use null if you do not know the urls yet 
 * @param file_options (optional) See RRDFile constructor for details.
 * @param sumfile_options (optional) See RRDFileSum constructor for details.
 * @param graph_options (optional) See rrdFlot constructor for details.
 * @param ds_graph_options (optional)
 * @param rrdflot_defaults (optional)
 * @param ds_op_list (optional) If present, will wrap the data in RRDFilterOp
 * @param rrd_op_list (optional) If present, will wrap the data in RRDRRAFilterAvg
 * @param customization_callback (optional) If present, will be called after the data has been loaded and before the graph is drawn
 * @constructor
*/
function rrdFlotSumAsync(html_id, url_list, file_options, sumfile_options, graph_options, ds_graph_options, rrdflot_defaults, ds_op_list, rra_op_list, customization_callback ) {
	this.html_id = html_id;
	this.url_list = url_list;
	this.file_options = file_options;
	this.sumfile_options = sumfile_options;
	this.graph_options = graph_options;
	this.ds_graph_options = ds_graph_options;
	this.rrdflot_defaults = rrdflot_defaults;
	this.ds_op_list = ds_op_list;
	this.rra_op_list = rra_op_list;

	this.customization_callback = customization_callback;

	this.rrd_flot_obj = null;
	this.rrd_data = null; //rrd_data will contain the sum of all the loaded data

	this.loaded_data = null;

	if (url_list !== null) {
		this.reload(url_list);
	}
}

rrdFlotSumAsync.prototype.reload = function(url_list) {
	rrdFlotMultiAsyncReload(this, url_list);
};

rrdFlotSumAsync.prototype.callback = function() {
	if (this.rrd_flot_obj !== null) delete this.rrd_flot_obj;
	var real_data_arr = [];
	for (var i in this.loaded_data) {
		// account for failed loaded urls
		var el = this.loaded_data[i];
		if (el !== undefined) real_data_arr.push(el);
	}
	var rrd_sum = new RRDFileSum(real_data_arr, this.sumfile_options);
	if (this.rrd_data !== null) delete this.rrd_data;
	this.rrd_data = rrd_sum;

	if (this.customization_callback !== undefined) this.customization_callback(this);

	rrd_sum = this.rrd_data; // customization_callback may have altered it
	if (this.ds_op_list !== undefined) rrd_sum = new RRDFilterOp(rrd_sum, this.ds_op_list);
	if (this.rra_op_list !== undefined) rrd_sum = new RRDRRAFilterAvg(rrd_sum, this.rra_op_list);
	this.rrd_flot_obj = new rrdFlot(this.html_id, rrd_sum, this.graph_options, this.ds_graph_options, this.rrdflot_defaults);
};

/**
 * This class creates a graph out of a set of files, using rrdFlotMatrix to glue them together. Once instantiated, the object will automatically draw the plot and handle user interaction.
 * @param html_id ID of a HTML element, possibly a div.
 * @param url_list A list of tuples pointing to the files to load. Each tuple must be [file_id, file_url].
 * @param file_options (optional) See RRDFile constructor for details.
 * @param ds_list (optional) See rrdFlotMatrix constructor for details.
 * @param graph_options (optional) See rrdFlotMatrix constructor for details.
 * @param ds_graph_options (optional) 
 * @param rrdflot_defaults (optional)
 * @param ds_op_list (optional) If present, will wrap the data in RRDFilterOp
 * @param rrd_op_list (optional) If present, will wrap the data in RRDRRAFilterAvg
 * @param customization_callback (optional) If present, will be called after the data has been loaded and before the graph is drawn
 * @constructor
 */

function rrdFlotMatrixAsync(html_id, url_pair_list, file_options, ds_list, graph_options, rrd_graph_options, rrdflot_defaults, ds_op_list, rra_op_list, customization_callback) {
	this.html_id = html_id;
	this.url_pair_list = url_pair_list;
	this.file_options = file_options;
	this.ds_list = ds_list;
	this.graph_options = graph_options;
	this.rrd_graph_options = rrd_graph_options;
	this.rrdflot_defaults = rrdflot_defaults;
	this.ds_op_list = ds_op_list;
	this.rra_op_list = rra_op_list;

	this.customization_callback = customization_callback;

	this.rrd_flot_obj = null;
	this.rrd_data = null; //rrd_data will contain the data of the first url; still useful to explore the DS and RRA structure

	this.loaded_data = null;

	this.url_list = null;
	if (url_pair_list !== null) {
		this.reload(url_pair_list);
	}
}

rrdFlotMatrixAsync.prototype.reload = function(url_pair_list) {
	this.url_pair_list = url_pair_list;
	var url_list = [];
	for (var i in this.url_pair_list) {
		url_list.push(this.url_pair_list[i][1]);
	}

	rrdFlotMultiAsyncReload(this, url_list);
};

rrdFlotMatrixAsync.prototype.callback = function() {
	if (this.rrd_flot_obj !== null) delete this.rrd_flot_obj;

	var real_data_arr = [];
	for (var i in this.loaded_data) {
		// account for failed loaded urls
		var el = this.loaded_data[i];
		if (el !== undefined) real_data_arr.push([this.url_pair_list[i][0], el]);
	}
	this.rrd_data = real_data_arr[0];

	if (this.customization_callback !== undefined) this.customization_callback(this);

	for (i in real_data_arr) {
		if (this.ds_op_list !== undefined) real_data_arr[i] = new RRDFilterOp(real_data_arr[i], this.ds_op_list);
		if (this.rra_op_list !== undefined) real_data_arr[i] = new RRDRRAFilterAvg(real_data_arr[i], this.rra_op_list);
	}
	this.rrd_flot_obj = new rrdFlotMatrix(this.html_id, real_data_arr, this.ds_list, this.graph_options, this.rrd_graph_options, this.rrdflot_defaults);
};
