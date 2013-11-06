#
# This make file creates the javascriptrdd.js file
# that contains all the other library files
# It also strips out any indentation, to save space
# 
# While the users can opt to include the single modules
# having a single file makes for easier development.
#

all: lib/javascriptrrd.js

lib/javascriptrrd.js: \
   lib/binaryXHR.js lib/rrdFile.js \
   lib/rrdFlotSupport.js lib/rrdFlot.js lib/rrdFlotMatrix.js \
   lib/rrdFilter.js lib/rrdMultiFile.js \
   lib/rrdFlotAsync.js
	cat $^ > $@

wlibs: lib/javascriptrrd.wlibs.js

lib/javascriptrrd.wlibs.js: lib/javascriptrrd.js \
   ../flot/jquery.min.js ../flot/jquery.flot.min.js \
   ../flot/jquery.flot.selection.min.js ../flot/jquery.flot.tooltip.js
	cat $^ > $@

clean:
	rm -f lib/javascriptrrd.js lib/javascriptrrd.wlibs.js
