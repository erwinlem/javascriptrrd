var expect = require("chai").expect;
var binaryXHR = require("../lib/binaryXHR.js").FetchBinaryURL;
var RRDFile = require("../lib/rrdFile.js").RRDFile;
var assert = require('assert');

describe("file loading", function(){

	it("load file", function() {
		var bf = binaryXHR("example_rrds/example3.rrd");
		assert.equal(bf.getCStringAt(0,3),"RRD");
	});	    

	it("load rrd file", function() {
		var bf = binaryXHR("example_rrds/example3.rrd");
		var rrd_data = new RRDFile(bf);
	});	    
});
