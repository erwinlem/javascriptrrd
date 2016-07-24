var expect = require("chai").expect;
var assert = require('assert');
var jsdom = require('jsdom');

var binaryXHR = require("../lib/binaryXHR.js");
var rrdFile = require('../lib/rrdFile.js');
var rrdGraph = require('../lib/rrdGraph.js');

describe("file loading", function(){

	it("load file", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example3.rrd");
		assert.equal(bf.getCStringAt(0,3),"RRD");
	});	    

	it("load RRDFile", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example3.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
	});	    

	it("load invalid rrd file", function() {
		var bf = new binaryXHR.BinaryFile("README.md");
		var fn = function() {
			var rrd_data = new rrdFile.RRDFile(bf);
		}
		expect(fn).to.throw();
	});	    

	it("check known rra value", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(42,0), 166.25);
	});	    

	it("check known rra amd64", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example_amd64.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(10,0), 9591.318830506743);
	});	    

	it("check known rra mips", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example_mips.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(10,0), 0.4615386513891367);
	});	    

	it("check known rra openwrt", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example_openwrt.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		assert.equal(rrd_data.getRRA(0).getEl(42,0), 420);
	});	    

});

describe("rrd functions", function(){

	// http://stackoverflow.com/questions/30235492/jquery-via-jsdom-isnt-a-functor-giving-typeerror
	beforeEach(function () {
		global.document = jsdom.jsdom('<html><body><section id="banner"></section></body></html>');
		global.window = global.document.defaultView;
		global.navigator = global.window.navigator;

		global.$ = global.jQuery = require('jquery');
	})


	it("header", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		rrd_data.getMinStep();
		rrd_data.rrd_header.getLastUpdate();
		rrd_data.getNrDSs();
		rrd_data.rrd_header.getDSNames();

		rrd_data.getNrRRAs();
		rrd_data.rrd_header.getRRAInfo(0);
	});

	it("datasource", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		var ds = rrd_data.getDS(0);
	});	    
	
	it("rra info", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		var rraInfo = rrd_data.rrd_header.getRRAInfo(0);
	});	    

	it("rra", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_data = new rrdFile.RRDFile(bf);
		var rra= rrd_data.getRRA(0);
	});	    

	it("flotData", function() {
		var bf = new binaryXHR.BinaryFile("example_rrds/example1.rrd");
		var rrd_Graph = new rrdGraph.rrdGraph();
		rrd_Graph.addRrdFile(new rrdFile.RRDFile(bf));
		rrd_Graph.getFlotData();

	});	    


});

