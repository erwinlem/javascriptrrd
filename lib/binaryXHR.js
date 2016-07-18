/**
 * This class implements the methods needed to access the content of the binary file.
 * @todo use https://www.npmjs.com/package/binary-file
 * @param {string} url URL from where to load the binary file.
 */
function BinaryFile(url, onload) {
	this.data = [];
	this.filePos = 0;
	this.doubleMantExpHi = Math.pow(2, -28);
	this.doubleMantExpLo = Math.pow(2, -52);
	this.doubleMantExpFast = Math.pow(2, -20);
	this.switch_endian = false;

	this.readAlignLong = 4;
	this.readAligndouble = 4;

	if (typeof XMLHttpRequest === 'undefined') {
		// we are running node.js
		this.data = require("fs").readFileSync(url);
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
			that.data = new Uint8Array(request.response);
			for (var i=0; i<request.response; i++) {
				that.data[i] = request.response[i];
			}
			// stupid async complex stuff 
			onload(that);
		};
		request.send();
	}
}	

/**
 * @return {byte} an 8 bit unsigned integerr
 */
BinaryFile.prototype.getByteAt = function(iOffset) {
	return this.data[iOffset];
};

/**
 * @return {} 
 */
BinaryFile.prototype.getEndianByteAt = function(iOffset, width, delta) {
	if (this.switch_endian)
		return this.getByteAt(iOffset + width - delta - 1);
	else
		return this.getByteAt(iOffset + delta);
};

/**
 * @return {Number} the number of bytes held by the object. 
 */
BinaryFile.prototype.getLength = function() {
	return this.data.length;
};

/**
 * @return {int} a 32 bit little endian unsigned integer from offset idx.
 */
BinaryFile.prototype.getLongAt = function(iOffset) {
	var iByte1 = this.getEndianByteAt(iOffset, 4, 0),
	iByte2 = this.getEndianByteAt(iOffset, 4, 1),
	iByte3 = this.getEndianByteAt(iOffset, 4, 2),
	iByte4 = this.getEndianByteAt(iOffset, 4, 3);

	var iLong = (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
	if (iLong < 0) iLong += 2<<31;
	return iLong;
};

/**
 * @return {string} Get a zero terminated string of limited size from offset idx.  
 */
BinaryFile.prototype.getCStringAt = function(iOffset, iMaxLength) {
	var aStr = [];
	for (var i = iOffset, j = 0;
			(i < iOffset + iMaxLength) && (this.getByteAt(i) > 0); i++, j++) {
		aStr[j] = String.fromCharCode(this.getByteAt(i));
	}
	return aStr.join("");
};

/**
 * @return {double} a double float (64 bit little endian) from offset idx. returns undefined if the value is not a float or is infinity. 
 */
BinaryFile.prototype.getDoubleAt = function(iOffset) {
	var iByte1 = this.getEndianByteAt(iOffset, 8, 0),
	iByte2 = this.getEndianByteAt(iOffset, 8, 1),
	iByte3 = this.getEndianByteAt(iOffset, 8, 2),
	iByte4 = this.getEndianByteAt(iOffset, 8, 3),
	iByte5 = this.getEndianByteAt(iOffset, 8, 4),
	iByte6 = this.getEndianByteAt(iOffset, 8, 5),
	iByte7 = this.getEndianByteAt(iOffset, 8, 6),
	iByte8 = this.getEndianByteAt(iOffset, 8, 7);
	var iSign = iByte8 >> 7;
	var iExpRaw = ((iByte8 & 0x7F) << 4) + (iByte7 >> 4);
	var iMantHi = ((((((iByte7 & 0x0F) << 8) + iByte6) << 8) + iByte5) << 8) + iByte4;
	var iMantLo = ((((iByte3) << 8) + iByte2) << 8) + iByte1;

	if (iExpRaw === 0) return 0.0;
	if (iExpRaw == 0x7ff) return undefined;

	var iExp = (iExpRaw & 0x7FF) - 1023;

	var dDouble = ((iSign == 1) ? -1 : 1) * Math.pow(2, iExp) * (1.0 + iMantLo * this.doubleMantExpLo + iMantHi * this.doubleMantExpHi);
	return dDouble;
};

BinaryFile.prototype.readByte = function() {
	if (this.filePos > this.data.length) {
		throw "read beyond eof";
	}
	return this.getByteAt(this.filePos++);
}

BinaryFile.prototype.readString = function() {
	var c = this.readByte();
	var s = '';
	while (c !== 0) {
		s += String.fromCharCode(c); 
		c = this.readByte();
	}
	return s;
}

BinaryFile.prototype.readLong = function() {
	this.align(this.readAlignLong);
	this.filePos += 4;
	return this.getLongAt(this.filePos-4);
}

BinaryFile.prototype.readDouble = function() {
	this.align(this.readAlignDouble);
	this.filePos += 8;
	return this.getDoubleAt(this.filePos-8);
}

BinaryFile.prototype.readNop = function(count) {
	this.filePos += count;
}

BinaryFile.prototype.align = function(blocksize) {
	if (this.filePos % blocksize === 0) {
		return;
	}
	this.filePos = this.filePos+(blocksize - this.filePos % blocksize);
}


// this will export the module to nodejs
if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.BinaryFile = BinaryFile;
} 
