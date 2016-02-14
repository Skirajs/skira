#!/usr/bin/env node
var Skira = require("../");

if (process.argv.length > 2) {
	process.chdir(process.argv[2]);
}

// TODO: create basic project if empty directory

var skira = new Skira();
