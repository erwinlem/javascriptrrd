"use strict";
/**
 * This class implements the methods needed to access the content of the binary file.
 * @todo use https://www.npmjs.com/package/binary-file
 * @param {string} url URL from where to load the binary file.
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
		// we are running in the browser
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		// need to use binary for webbrowsers
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.responseType = 'arraybuffer';
		var that = this;
		request.onreadystatechange = function(e) {
			// FIXME: error handling
			if (this.readyState !== (this.DONE || 4)) {
				return;
			}
			that.buffer = new DataView(request.response);
			// stupid async complex stuff 
			onload(that);
		};
		request.send();
	}
}	

BinaryFile.prototype = {
	/**
	 * @return {byte} an 8 bit unsigned integerr
	 */
	getByteAt : function(iOffset) {
		return this.buffer.getUint8(iOffset);
	},

	/**
	 * @return {int} a 32 bit little endian unsigned integer from offset idx.
	 */
	getLongAt : function(iOffset) {
		return this.buffer.getUint32(iOffset, !this.switch_endian );
	},

	/**
	 * @return {string} Get a zero terminated string of limited size from offset idx.  
	 */
	getCStringAt : function(iOffset, iMaxLength) {
		var aStr = '';
		for (var i = 0; (i < iMaxLength) && (this.getByteAt(i+iOffset) > 0); i++) {
			aStr += String.fromCharCode(this.getByteAt(i+iOffset));
		}
		return aStr;
	},

	/**
	 * @return {double} a double float (64 bit little endian) from offset idx. returns undefined if the value is not a float or is infinity. 
	 */
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
