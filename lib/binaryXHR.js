/**
 * @param strData rrd file data supplied as a string or buffer
 * This class implements the methods needed to access the content of the binary file.
 */
function BinaryFile(strData) {
	// a string is supplied by xmlhttp request, we need to convert this to a array
	if (typeof strData === 'string') {
		var buf = new ArrayBuffer(strData.length); // 2 bytes for each char
		var bufView = new Uint8Array(buf);
		for (var i=0; i<strData.length; i++) {
			bufView[i] = strData.charCodeAt(i) & 0xff;
		}
		strData = bufView;
	}

	this.data = strData;
	this.doubleMantExpHi = Math.pow(2, -28);
	this.doubleMantExpLo = Math.pow(2, -52);
	this.doubleMantExpFast = Math.pow(2, -20);
	this.switch_endian = false;
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

/**
 * @param {string} url URL from where to load the binary file.
 * @return {BinaryFile} An object of type BinaryFile.
 */
function FetchBinaryURL(url) {
	var data;

	if (typeof XMLHttpRequest === 'undefined') {
		// we are running node.js
		var fs = require("fs");
		data = fs.readFileSync(url);
	} else {
		// we are running in the browser
		var request = new XMLHttpRequest();
		request.open("GET", url, false);
		// need to use binary for webbrowsers
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.send(null);
		data = request.responseText;
	}

	return new BinaryFile(data);
}

if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.FetchBinaryURL = FetchBinaryURL;
} 
