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
function BinaryFile(strData, iDataOffset, iDataLength) {
	this.dataLength = 0;

	this.data = strData;
	this.dataOffset = iDataOffset || 0;
	this.doubleMantExpHi = Math.pow(2, -28);
	this.doubleMantExpLo = Math.pow(2, -52);
	this.doubleMantExpFast = Math.pow(2, -20);
	this.switch_endian = false;

	if (typeof strData == "string") {
		this.dataLength = iDataLength || this.data.length;

		this.getByteAt = function(iOffset) {
			return this.data.charCodeAt(iOffset + this.dataOffset) & 0xFF;
		};
	} else if (typeof strData == "unknown") {
		this.dataLength = iDataLength || IEBinary_getLength(this.data);

		this.getByteAt = function(iOffset) {
			return IEBinary_getByteAt(s.data, iOffset + this.dataOffset);
		};
	} else {
		throw new InvalidBinaryFile("Unsupported type " + (typeof strData));
	}
}	

/**
 * @return {} 
 */
BinaryFile.prototype.getRawData = function() {
	return data;
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
 * @return {} 
 */
BinaryFile.prototype.getLength = function() {
	return this.dataLength;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getSByteAt = function(iOffset) {
	var iByte = this.getByteAt(iOffset);
	if (iByte > 127)
		return iByte - 256;
	else
		return iByte;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getShortAt = function(iOffset) {
	var iShort = (this.getEndianByteAt(iOffset, 2, 1) << 8) + this.getEndianByteAt(iOffset, 2, 0);
	if (iShort < 0) iShort += 65536;
	return iShort;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getSShortAt = function(iOffset) {
	var iUShort = this.getShortAt(iOffset);
	if (iUShort > 32767)
		return iUShort - 65536;
	else
		return iUShort;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getLongAt = function(iOffset) {
	var iByte1 = this.getEndianByteAt(iOffset, 4, 0),
	iByte2 = this.getEndianByteAt(iOffset, 4, 1),
	iByte3 = this.getEndianByteAt(iOffset, 4, 2),
	iByte4 = this.getEndianByteAt(iOffset, 4, 3);

	var iLong = (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
	if (iLong < 0) iLong += 4294967296;
	return iLong;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getSLongAt = function(iOffset) {
	var iULong = this.getLongAt(iOffset);
	if (iULong > 2147483647)
		return iULong - 4294967296;
	else
		return iULong;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getStringAt = function(iOffset, iLength) {
	var aStr = [];
	for (var i = iOffset, j = 0; i < iOffset + iLength; i++, j++) {
		aStr[j] = String.fromCharCode(this.getByteAt(i));
	}
	return aStr.join("");
};

/**
 * @return {} 
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
 * @return {} 
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
// added
// Extracts only 4 bytes out of 8, loosing in precision (20 bit mantissa)
/**
 * @return {} 
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

	var dDouble = ((iSign == 1) ? -1 : 1) * Math.pow(2, iExp) * (1.0 + iMant * doubleMantExpFast);
	return dDouble;
};

/**
 * @return {} 
 */
BinaryFile.prototype.getCharAt = function(iOffset) {
	return String.fromCharCode(this.getByteAt(iOffset));
};

// ===============================================================
// Load a binary file from the specified URL 
// Will return an object of type BinaryFile
function FetchBinaryURL(url) {
	var request = new XMLHttpRequest();
	request.open("GET", url, false);
	try {
		request.overrideMimeType('text/plain; charset=x-user-defined');
	} catch (err) {
		// ignore any error, just to make both FF and IE work
	}
	request.send(null);

	var response = this.responseText;
	try {
		// for older IE versions, the value in responseText is not usable
		if (IEBinary_getLength(this.responseBody) > 0) {
			// will get here only for older verson of IE
			response = this.responseBody;
		}
	} catch (err) {
		// not IE, do nothing
	}

	var bf = new BinaryFile(response);
	return bf;
}


// ===============================================================
// Asyncronously load a binary file from the specified URL 
//
// callback must be a function with one or two arguments:
//  - bf = an object of type BinaryFile
//  - optional argument object (used only if callback_arg not undefined) 
function FetchBinaryURLAsync(url, callback, callback_arg) {
	var callback_wrapper = function() {
		if (this.readyState == 4) {
			var response = this.responseText;
			try {
				// for older IE versions, the value in responseText is not usable
				if (IEBinary_getLength(this.responseBody) > 0) {
					// will get here only for older verson of IE
					response = this.responseBody;
				}
			} catch (err) {
				// not IE, do nothing
			}

			var bf = new BinaryFile(response);
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
	try {
		request.overrideMimeType('text/plain; charset=x-user-defined');
	} catch (err) {
		// ignore any error, just to make both FF and IE work
	}
	request.send(null);
	return request;
}

