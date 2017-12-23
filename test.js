var expect = require("chai").expect;
var assert = require('assert');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

var binaryXHR = require("./binaryXHR.js");
var RRDFile = require('./RRDFile.js');
var RRDGraph = require('./RRDGraph.js');

describe("file loading", function(){

	it("load file", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example3.rrd");
		assert.equal(bf.getCStringAt(0,3),"RRD");
	});	    

	it("load RRDFile", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example3.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
	});	    

	it("load invalid rrd file", function() {
		var bf = new binaryXHR.BinaryFile("README.md");
		var fn = function() {
			var rrd_data = new RRDFile.RRDFile(bf);
		}
		expect(fn).to.throw();
	});	    

	it("lastUpdate", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example_amd64.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		// <lastupdate>1347055342</lastupdate> <!-- 2012-09-08 00:02:22 CEST -->
		assert.equal(rrd_data.lastUpdate, 1347055342);
	});	    



	it("check known rra value", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		assert.equal(rrd_data.rra[0].getEl(42,0), 166.25);
	});	    

	it("check known rra amd64", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example_amd64.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		assert.equal(rrd_data.rra[0].getEl(10,0), 9591.318830506743);
	});	    

	it("check known rra mips", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example_mips.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		assert.equal(rrd_data.rra[0].getEl(10,0), 0.4615386513891367);
	});	    

	it("check known rra openwrt", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example_openwrt.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		assert.equal(rrd_data.rra[0].getEl(42,0), 420);
	});	    

});

describe("rrd functions", function(){

	// http://stackoverflow.com/questions/30235492/jquery-via-jsdom-isnt-a-functor-giving-typeerror
	beforeEach(function () {
		global.document = new JSDOM('<html><body><section id="banner"></section></body></html>');
		global.$ = require('jquery')(global.document.window);
	})


	it("header", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		rrd_data.lastUpdate;
		rrd_data.ds.length;
		rrd_data.getDSNames();

		rrd_data.rra.length;
		rrd_data.rra[0];
	});

	it("datasource", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		var ds = rrd_data.ds[0];
	});	    
	
	it("rra info", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		var rraInfo = rrd_data.rra[0];
	});	    

	it("rra", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_data = new RRDFile.RRDFile(bf);
		var rra= rrd_data.rra[0];
	});	    

	it("flotData", function() {
		var bf = new binaryXHR.BinaryFile("rrd/example1.rrd");
		var rrd_Graph = new RRDGraph.RRDGraph();
		rrd_Graph.addRrdFile(new RRDFile.RRDFile(bf));
		rrd_Graph.getFlotData();

	});	    


});

