var expect = require("chai").expect;
var binaryXHR = require("../lib/binaryXHR.js").FetchBinaryURLAsync;

describe("rrd", function(){
	describe("constructor", function() {
		binaryXHR("example_rrds/example3.rrd", function (bf) {
			var i_rrd_data=new tags.RRDFile(bf);
		});	    
	});	    
});
