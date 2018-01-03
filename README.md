[![Build Status](https://travis-ci.org/erwinlem/javascriptrrd.svg?branch=master)](https://travis-ci.org/erwinlem/javascriptrrd)
[![Coverage Status](https://coveralls.io/repos/erwinlem/javascriptrrd/badge.svg?branch=master&service=github)](https://coveralls.io/github/erwinlem/javascriptrrd?branch=master)
[![bitHound Score](https://www.bithound.io/github/erwinlem/javascriptrrd/badges/score.svg)](https://www.bithound.io/github/erwinlem/javascriptrrd)
[![bitHound Dependencies](https://www.bithound.io/github/erwinlem/javascriptrrd/badges/dependencies.svg)](https://www.bithound.io/github/erwinlem/javascriptrrd/master/dependencies/npm)

Project goal
============

javascriptRRD is a library designed to plot data from rrd files using only clientside javascript.

javascriptRRD installation
==========================

Being Javascript an interpreted language, no compilation is needed. Just copy the files in the files located in the lib directory into a Web accessible location and use them.

The following libraries are used at runtime :

* Flot
* JQuery
	 
The following libraries are used to aid development :

* JsHint
* Chai
* Mocha
* Instanbul

Dependencies could be installed using npm or you could manually edit the file javascriptrrd.wlibs.js and point it to the right location. 

The examples directory contains ready to use examples, this could be used as a reference point.

Running tests
-------------

First install the dev packages :

```
npm update --save-dev
```

You can run the test or full coverage :

```
npm run test
npm run cover
```

Original implementation & credits
=================================

The original version of javascriptRRD can be found at : http://javascriptrrd.sourceforge.net

The goal of this fork is to make version for modern browsers with xhtml support. With the first stable release the name wil most likely change to avoid confusion.
