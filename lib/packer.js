const babelify = require("babelify");
const browserify = require("browserify");
const debug = require("debug")("skira:packer");
const EventEmitter = require("events").EventEmitter;
const fs = require("fs");
const watchify = require("watchify");

function Packer(isBrowser, engine, site, outFile) {
	EventEmitter.call(this);

	this.isBrowser = isBrowser;
	this.engine = engine;
	this.site = site;
	this.outFile = outFile;
}

Packer.prototype = Object.create(EventEmitter.prototype);

Packer.prototype.start = function() {
	var opts = {
		basedir: __dirname,
		cache: {},
		packageCache: {},
		bare: !this.isBrowser,
		browserField: !!this.isBrowser,
		externalRequireName: "var require"
	};

	if (!this.isBrowser) {
		opts.insertGlobalVars = {
			process: () => ("process")
		};

		opts.builtins = false;
	}

	var b = this.b = browserify(opts);

	b.plugin(watchify);

	b.transform(babelify, {
		ignore: this.site,
		presets: [ require("babel-preset-es2015") ],
		plugins: [ require("babel-plugin-transform-async-to-generator") ]
	});

	b.require("babel-polyfill");

	if (this.engine) {
		b.require(this.engine, { expose: "engine" });
	}

	if (this.site) {
		b.require(this.site, { expose: "site" });
	}

	b.on("update", () => {
		debug("Update triggered.");
		this.bundle();
	});

	this.bundle();
};

Packer.prototype.bundle = function() {
	if (this.busy) {
		this.queue = true;
		debug("Bundle already busy...");
		return;
	}

	this.busy = true;

	debug("Creating new bundle...");

	var footer = "require('babel-polyfill');if(typeof module=='undefined'){module={exports:{}}}module.exports = ";
	footer += this.engine ? "require('engine')" : "";
	footer += this.site ? "(require('site'))" : "()";

	var bundle = this.b.bundle();
	var out = fs.createWriteStream(this.outFile);

	bundle.pipe(out, { end: false });

	bundle.on("error", (err) => {
		debug("Error while packing bundle: %s", err.message || err);
		this.busy = false;
	});

	bundle.on("end", () => {
		out.end(footer);
		debug("Done generating bundle.");

		this.busy = false;
		this.emit("update");

		if (this.queue) {
			setImmediate(() => this.bundle());
		}
	});
};

module.exports = Packer;
