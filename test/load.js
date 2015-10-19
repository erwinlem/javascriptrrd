var expect = require("chai").expect;
var assert = require('assert');

var binaryXHR = require("../lib/binaryXHR.js");
var rrdFile = require('../lib/rrdFile.js');
var rrdFlotAsync = require('../lib/rrdFlotAsync.js');
var rrdGraph = require('../lib/rrdGraph.js');

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

describe("rrd functions", function(){

	it("header", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		rrd_data.getMinStep();
		rrd_data.getLastUpdate();
		rrd_data.getNrDSs();
		rrd_data.getDSNames();
		var a = rrd_data.getDS(0);
		rrd_data.getDS(a.getName());
		rrd_data.getNrRRAs();
		rrd_data.getRRAInfo();

	});	    
	
	it("flotData", function() {
		var bf = binaryXHR.FetchBinaryURL("example_rrds/example1.rrd");
		var rrd_Graph = new rrdGraph.rrdGraph();
		rrd_Graph.addRrdFile(new rrdFile.RRDFile(bf));
		rrd_Graph.getFlotData();

	});	    


});

