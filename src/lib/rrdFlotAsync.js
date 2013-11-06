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
 *  rrdFile.js
 *  rrdFlot.js
 *
 * Those modules may have other requirements.
 *
 */

/* Internal helper function */
function rrdFlotAsyncCallback(bf,obj) {
  var i_rrd_data=undefined;
  if (bf.getLength()<1) {
    alert("File "+obj.url+" is empty (possibly loading failed)!");
    return 1;
  }
  try {
    var i_rrd_data=new RRDFile(bf);            
  } catch(err) {
    alert("File "+obj.url+" is not a valid RRD archive!\n"+err);
  }
  if (i_rrd_data!=undefined) {
    if (obj.rrd_data!=null) delete obj.rrd_data;
    obj.rrd_data=i_rrd_data;
    obj.callback();
  }
}

/*
 * For further documentation about the arguments
 * see rrdFlot.js
 */

/* Use url==null if you do not know the url yet */
function rrdFlotAsync(html_id, url, graph_options, ds_graph_options, rrdflot_defaults) {
  this.html_id=html_id;
  this.url=url;
  this.graph_options=graph_options;
  this.ds_graph_options=ds_graph_options;
  this.rrdflot_defaults=rrdflot_defaults;

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
  this.rrd_flot_obj=new rrdFlot(this.html_id, this.rrd_data, this.graph_options, this.ds_graph_options, this.rrdflot_defaults);
};

