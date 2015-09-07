var expect = require("chai").expect;
var assert = require('assert');

var binaryXHR = require("../lib/binaryXHR.js");
var RRDDS = require('../lib/RRDDS.js');
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

	it("load RRDFile", function() {
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

	it("check known rra value", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(42,0), 166.25);
	});	    

	it("check known rra amd64", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example_amd64.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(10,0), 9591.318830506743);
	});	    

	it("check known rra mips", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example_mips.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(10,0), 0.4615386513891367);
	});	    

	it("check known rra openwrt", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example_openwrt.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(42,0), 420);
	});	    

});
