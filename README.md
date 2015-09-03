[![Coverage Status](https://coveralls.io/repos/erwinlem/javascriptrrd/badge.svg?branch=master&service=github)](https://coveralls.io/github/erwinlem/javascriptrrd?branch=master)

Project goal
============

javascriptRRD is a library designed to plot data from rrd files using only clientside javascript.

javascriptRRD installation
==========================

Being Javascript an interpreted language, no compilation is needed. Just copy the files in the files located in the lib directory into a Web accessible location and use them.

The following libraries are used at runtime :

	* flot
	* jquery
	 
The following libraries are used to aid development :

	* jsdoc
	* jshint
	* chai
	* mocha

Dependencies could be installed using npm or you could manually edit the file javascriptrrd.wlibs.js and point it to the right location. 

Original implementation & credits
=================================

The original version of javascriptRRD can be found at : http://javascriptrrd.sourceforge.net

The goal of this fork is to make version for modern browsers with xhtml support. With the first stable release the name wil most likely change to avoid confusion.
