// get directory of js file
var scripts = document.getElementsByTagName("script"),
    src = scripts[scripts.length - 1].src;
base = (src.substr(0, src.lastIndexOf('/') + 1));

// javascript has no proper include function, i mean like, wtf?
// http://stackoverflow.com/questions/950087/include-a-javascript-file-in-another-javascript-file
function includeJS(s) {
    for (i = 0; i < s.length; i++) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = base + s[i];
        document.getElementsByTagName("head")[0].appendChild(script)
    };
}

// include rrd
includeJS([
    "binaryXHR.js",
    "rrdFile.js",
    "rrdFlotSupport.js",
    "rrdFlot.js",
    "rrdFlotMatrix.js",
    "rrdFilter.js",
    "rrdMultiFile.js",
    "rrdFlotAsync.js"
]);


// include flot
includeJS([
    "../../node_modules/flot/jquery.js",
    "../../node_modules/flot/jquery.flot.js",
    "../../node_modules/flot/jquery.flot.time.js",
    "../../node_modules/flot/jquery.flot.selection.js"
]);
