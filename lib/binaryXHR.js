/**
 * This is a helper exception class that can be thrown while loading the binary file.
 */
function InvalidBinaryFile(msg) {
	this.message = msg;
	this.name = "Invalid BinaryFile";
}

InvalidBinaryFile.prototype.toString = function() {
	return this.name + ': "' + this.message + '"';
};

/**
 * This class implements the methods needed to access the content of the binary file.
 */
function BinaryFile(strData) {
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
BinaryFile.prototype.getRawData = function() {
	return this.data;
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
 * @return {SByte} an 8 bit signed integer from offset 
 */
BinaryFile.prototype.getSByteAt = function(iOffset) {
	var iByte = this.getByteAt(iOffset);
	if (iByte > 127)
		return iByte - 256;
	else
		return iByte;
};

/**
 * @return {Short} a 16 bit little endian unsigned integer from offset idx. 
 */
BinaryFile.prototype.getShortAt = function(iOffset) {
	var iShort = (this.getEndianByteAt(iOffset, 2, 1) << 8) + this.getEndianByteAt(iOffset, 2, 0);
	if (iShort < 0) iShort += 65536;
	return iShort;
};

/**
 * @return {} a 16 bit little endian signed integer from offset idx 
 */
BinaryFile.prototype.getSShortAt = function(iOffset) {
	var iUShort = this.getShortAt(iOffset);
	if (iUShort > 32767)
		return iUShort - 2<<15;
	else
		return iUShort;
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
 * @return {int} a 32 bit little endian signed integer from offset idx
 */
BinaryFile.prototype.getSLongAt = function(iOffset) {
	var iULong = this.getLongAt(iOffset);
	if (iULong > 2147483647)
		return iULong - 2<<31;
	else
		return iULong;
};

/**
 * @return {string} a fixed length string from offset idx 
 */
BinaryFile.prototype.getStringAt = function(iOffset, iLength) {
	var aStr = [];
	for (var i = iOffset, j = 0; i < iOffset + iLength; i++, j++) {
		aStr[j] = String.fromCharCode(this.getByteAt(i));
	}
	return aStr.join("");
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
 * @return {} Return a low resolution (20 bit mantissa) double flat obtained from the high 32 bits of the original little endian double float from offset idx. Return undefined if the value is not a float or is infinity.
 */
BinaryFile.prototype.getFastDoubleAt = function(iOffset) {
	var iByte5 = this.getEndianByteAt(iOffset, 8, 4),
	iByte6 = this.getEndianByteAt(iOffset, 8, 5),
	iByte7 = this.getEndianByteAt(iOffset, 8, 6),
	iByte8 = this.getEndianByteAt(iOffset, 8, 7);
	var iSign = iByte8 >> 7;
	var iExpRaw = ((iByte8 & 0x7F) << 4) + (iByte7 >> 4);
	var iMant = ((((iByte7 & 0x0F) << 8) + iByte6) << 8) + iByte5;

	if (iExpRaw === 0) return 0.0;
	if (iExpRaw == 0x7ff) return undefined;

	var iExp = (iExpRaw & 0x7FF) - 1023;

	var dDouble = ((iSign == 1) ? -1 : 1) * Math.pow(2, iExp) * (1.0 + iMant * this.doubleMantExpFast);
	return dDouble;
};

/**
 * @return {} Get a character from offset idx. 
 */
BinaryFile.prototype.getCharAt = function(iOffset) {
	return String.fromCharCode(this.getByteAt(iOffset));
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
		request.responseType = 'arraybuffer';
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.send(null);
		data = request.responseText;
	}

	return new BinaryFile(data);
}


/**
 * @param {string} url URL from where to load the binary file.
 * @param {function} Pointer to the function that will be called when the binary file has been loaded. 
 * The function will be given one or two arguments; the first one is an object of type BinaryFile. The second one is the argument described below, if available.
 * @param {object} callback_arg If present, it will be given as argument to the callback function.
 * @return A reference to the XMLHttpRequest object. It may be used to verify the status of the load or to implement timeouts. The callback function will receive the loaded binary file.
 */
function FetchBinaryURLAsync(url, callback, callback_arg) {
	var callback_wrapper = function() {
		if (this.readyState == 4) {
			var bf = new BinaryFile(this.responseText);
			if (callback_arg !== null) {
				callback(bf, callback_arg);
			} else {
				callback(bf);
			}
		}
	};

	var request = new XMLHttpRequest();
	request.onreadystatechange = callback_wrapper;
	request.open("GET", url, true);
	// need to use binary for webbrowsers
	if (request.overrideMimeType) {
		request.overrideMimeType('text/plain; charset=x-user-defined');
	}	
	request.send(null);
	return request;
}

if(typeof(exports) !== 'undefined' && exports !== null) {
	exports.FetchBinaryURLAsync = FetchBinaryURLAsync;
	exports.FetchBinaryURL = FetchBinaryURL;
} 
