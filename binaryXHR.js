"use strict";
/**
 * This class implements the methods needed to access the content of the binary file.
 * todo: use https://www.npmjs.com/package/binary-file
 */
function BinaryFile(url, onload) {
	this.filePos = 0;
	this.switch_endian = false;

	this.readAlignLong = 4;
	this.readAligndouble = 4;

	if (typeof XMLHttpRequest === 'undefined') {
		// we are running node.js
		this.buffer = new DataView(new Uint8Array(require("fs").readFileSync(url)).buffer);
	} else {
		var that = this;
		fetch(url)
			.then(function(response) {
    			return response.arrayBuffer();
  			}).then(function(buffer) {
				that.buffer = new DataView(buffer);
				onload(that);
    		}
  			);
	}
}	

BinaryFile.prototype = {
	getByteAt : function(iOffset) {
		return this.buffer.getUint8(iOffset);
	},

	getLongAt : function(iOffset) {
		return this.buffer.getUint32(iOffset, !this.switch_endian );
	},

	getCStringAt : function(iOffset, iMaxLength) {
		var aStr = '';
		for (var i = 0; (i < iMaxLength) && (this.getByteAt(i+iOffset) > 0); i++) {
			aStr += String.fromCharCode(this.getByteAt(i+iOffset));
		}
		return aStr;
	},

	getDoubleAt : function(iOffset) {
		return this.buffer.getFloat64(iOffset, !this.switch_endian );
	},

	readByte : function() {
		return this.getByteAt(this.filePos++);
	},

	readPaddedString : function(l) {
		var s = this.getCStringAt(this.filePos, l);
		this.filePos += l;
		return s;
	},

	readString : function() {
		var s = '';
		var c;

		while ((c = this.readByte()) !== 0) {
			s += String.fromCharCode(c); 
		}
		return s;
	},

	readInt : function() {
		this.align(this.readAlignLong);
		this.filePos += this.readAlignLong;
		return this.getLongAt(this.filePos-this.readAlignLong);
	},

	readLong : function() {
		this.align(this.readAlignLong);
		this.filePos += 4;
		return this.getLongAt(this.filePos-4);
	},

	readDouble : function() {
		this.align(this.readAlignDouble);
		this.filePos += 8;
		return this.getDoubleAt(this.filePos-8);
	},

	readNop : function(count) {
		this.filePos += count;
	},

	align : function(blocksize) {
		if (this.filePos % blocksize === 0) {
			return;
		}
		this.filePos = this.filePos+(blocksize - this.filePos % blocksize);
	},

};

// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.BinaryFile = BinaryFile;
} 
