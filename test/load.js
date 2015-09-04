var expect = require("chai").expect;
var assert = require('assert');

var binaryXHR = require("../lib/binaryXHR.js");
var rrdFile = require('../lib/rrdFile.js');
var rrdFilter = require('../lib/rrdFilter.js');
var rrdFlotAsync = require('../lib/rrdFlotAsync.js');
var rrdFlotMatrix = require('../lib/rrdFlotMatrix.js');
var rrdFlotSupport = require('../lib/rrdFlotSupport.js');
var rrdMultiFile = require('../lib/rrdMultiFile.js');

describe("file loading", function(){

	it("load file", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example3.rrd");
		assert.equal(bf.getCStringAt(0,3),"RRD");
	});	    

	it("load rrd file", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example3.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
	});	    

	it("load invalid rrd file", function() {
		var bf = binaryXHR.FetchBinaryURL("README.md");
		var fn = function() {
			var rrd_data = new rrdFile.RRDFile(bf);
		}
		expect(fn).to.throw("Wrong magic id.");
	});	    
});
