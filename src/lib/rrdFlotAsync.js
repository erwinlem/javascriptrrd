/*
 * Async versions of the rrdFlot class
 * Part of the javascriptRRD package
 * Copyright (c) 2013 Igor Sfiligoi, isfiligoi@ucsd.edu
 *
 * Original repository: http://javascriptrrd.sourceforge.net/
 * 
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 *
 */

/*
 * Local dependencies:
 *  binaryXHR.js
 *  rrdFile.js and/or rrdMultiFile.js
 *  optionally rrdFilter.js
 *  rrdFlot.js
 *
 * Those modules may have other requirements.
 *
 */


/*
 * customization_callback = function(obj)
 *  This function, if defined, is called after the data has been loaded 
 *    and before the rrdFlot object is instantiated
 *
 *  The object passed as the sole argument is guaranteed to have the following arguments
 *    obj.rrd_data
 *    obj.graph_options
 *    obj.ds_graph_options
 *    obj.rrdflot_defaults
 *    obj.ds_op_list
 *    obj.rra_op_list
 *
 *  The purpose of this callback is to give the caller the option of personalizing
 *    the Flot graph based on the content of the rrd_data
 *    
/* Internal helper function */
function rrdFlotAsyncCallback(bf,obj) {
  var i_rrd_data=undefined;
  if (bf.getLength()<1) {
    alert("File "+obj.url+" is empty (possibly loading failed)!");
    return 1;
  }
  try {
    i_rrd_data=new RRDFile(bf);            
  } catch(err) {
    alert("File "+obj.url+" is not a valid RRD archive!\n"+err);
  }
  if (i_rrd_data!=undefined) {
    if (obj.rrd_data!=null) delete obj.rrd_data;
    obj.rrd_data=i_rrd_data;
    obj.callback();
  }
}

/* Use url==null if you do not know the url yet */
function rrdFlotAsync(html_id, url, 
		      graph_options, ds_graph_options, rrdflot_defaults, // see rrdFlot.js::rrdFlot for documentation of these
		      ds_op_list,                                        // if defined, see rrdFilter.js::RRDFilterOp for documentation
		      rra_op_list,                                       // if defined, see rrdFilter.js::RRDRRAFilterAvg for documentation
                      customization_callback                             // if defined, see above
		      ) {
  this.html_id=html_id;
  this.url=url;
  this.graph_options=graph_options;
  this.ds_graph_options=ds_graph_options;
  this.rrdflot_defaults=rrdflot_defaults;
  this.ds_op_list=ds_op_list;
  this.rra_op_list=rra_op_list;

  this.customization_callback=customization_callback;

  this.rrd_flot_obj=null;
  this.rrd_data=null;

  if (url!=null) {
    this.reload(url);
  }
}

rrdFlotAsync.prototype.reload = function(url) {
  this.url=url;
  try {
    FetchBinaryURLAsync(url,rrdFlotAsyncCallback,this);
  } catch (err) {
    alert("Failed loading "+url+"\n"+err);
  }
};

rrdFlotAsync.prototype.callback = function() {
  if (this.rrd_flot_obj!=null) delete this.rrd_flot_obj;

  if (this.customization_callback!=undefined) this.customization_callback(this);

  var irrd_data=this.rrd_data;
  if (this.ds_op_list!=undefined) irrd_data=new RRDFilterOp(irrd_data,this.ds_op_list);
  if (this.rra_op_list!=undefined) irrd_data=new RRDRRAFilterAvg(irrd_data,this.rra_op_list);
  this.rrd_flot_obj=new rrdFlot(this.html_id, irrd_data, this.graph_options, this.ds_graph_options, this.rrdflot_defaults);
};


// ================================================================================================================

/* Internal helper function */
function rrdFlotMultiAsyncCallback(bf,arr) {
  var obj=arr[0];
  var idx=arr[1];

  obj.files_loaded++; // increase this even if it fails later on, else we will never finish

  var i_rrd_data=undefined;
  if (bf.getLength()<1) {
    alert("File "+obj.url_list[idx]+" is empty (possibly loading failed)! You may get a parial result in the graph.");
  } else {
    try {
      i_rrd_data=new RRDFile(bf);
    } catch(err) {
      alert("File "+obj.url_list[idx]+" is not a valid RRD archive! You may get a partial result in the graph.\n"+err);
    }
  }
  if (i_rrd_data!=undefined) {
    obj.loaded_data[idx]=i_rrd_data;
  }

  if (obj.files_loaded==obj.files_needed) {
    obj.callback();
  }
}

/* Use url_list==null if you do not know the urls yet */
function rrdFlotSumAsync(html_id, url_list, 
			 graph_options, ds_graph_options, rrdflot_defaults, // see rrdFlot.js::rrdFlot for documentation of these
			 ds_op_list,                                        // if defined, see rrdFilter.js::RRDFilterOp for documentation
			 rra_op_list,                                       // if defined, see rrdFilter.js::RRDRRAFilterAvg for documentation
			 customization_callback                             // if defined, see above
		      ) {
  this.html_id=html_id;
  this.url_list=url_list;
  this.graph_options=graph_options;
  this.ds_graph_options=ds_graph_options;
  this.rrdflot_defaults=rrdflot_defaults;
  this.ds_op_list=ds_op_list;
  this.rra_op_list=rra_op_list;

  this.customization_callback=customization_callback;

  this.rrd_flot_obj=null;
  this.rrd_data=null; //rrd_data will contain the sum of all the loaded data

  this.loaded_data=null;

  if (url_list!=null) {
    this.reload(url_list);
  }
}

rrdFlotSumAsync.prototype.reload = function(url_list) {
  this.files_needed=url_list.length;
  this.url_list=url_list;
  delete this.loaded_data;
  this.loaded_data=[];
  this.files_loaded=0;
  for (i in url_list) {
    try {
      FetchBinaryURLAsync(url_list[i],rrdFlotMultiAsyncCallback,[this,i]);
    } catch (err) {
      alert("Failed loading "+url_list[i]+". You may get a partial result in the graph.\n"+err);
      this.files_needed--;
    }
  }
};

rrdFlotSumAsync.prototype.callback = function() {
  if (this.rrd_flot_obj!=null) delete this.rrd_flot_obj;
  var real_data_arr=new Array();
  for (i in this.loaded_data) {
    // account for failed loaded urls
    var el=this.loaded_data[i];
    if (el!=undefined) real_data_arr.push(el);
  }
  var rrd_sum=new RRDFileSum(real_data_arr);
  if (this.rrd_data!=null) delete this.rrd_data;
  this.rrd_data=rrd_sum;

  if (this.customization_callback!=undefined) this.customization_callback(this);

  rrd_sum=this.rrd_data; // customization_callback may have altered it
  if (this.ds_op_list!=undefined) rrd_sum=new RRDFilterOp(rrd_sum,this.ds_op_list);
  if (this.rra_op_list!=undefined) rrd_sum=new RRDRRAFilterAvg(rrd_sum,this.rra_op_list);
  this.rrd_flot_obj=new rrdFlot(this.html_id, rrd_sum, this.graph_options, this.ds_graph_options, this.rrdflot_defaults);
};

