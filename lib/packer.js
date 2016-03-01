const babelify = require("babelify");
const browserify = require("browserify");
const debug = require("debug")("skira:packer");
const envify = require("envify/custom");
const EventEmitter = require("events").EventEmitter;
const fs = require("fs");
const mold = require("mold-source-map");
const pathTool = require("path");
const through = require("through2");
const watchify = require("watchify");

function Packer(part, isBrowser, engine, site, outFile) {
	EventEmitter.call(this);

	this.part = part;
	this.isBrowser = isBrowser;
	this.engine = engine;
	this.site = site;
	this.outFile = outFile;
}

Packer.prototype = Object.create(EventEmitter.prototype);

Packer.prototype.start = function() {
	if (this.b) {
		return;
	}

	this.busy = true;

	var builtins = this.isBrowser ? require("browserify/lib/builtins") : {};

	if (this.site) {
		builtins["site"] = this.site;
		builtins["eventemitter3-collector"] = require.resolve("eventemitter3-collector");
		builtins["jade/runtime"] = require.resolve("jade/runtime");
	}

	this.b = browserify(this.site ? "../core/loader" : this.engine, {
		debug: true,
		basedir: __dirname,
		cache: {},
		packageCache: {},
		browserField: !!this.isBrowser,
		builtins: builtins,
		insertGlobalVars: this.isBrowser ? {} : {
			process: null
		}
	});

	if (!this.isBrowser) {
		var origResolve = this.b._bresolve;

		this.b._bresolve = (id, opts, cb) => {
			if (typeof this.b._options.builtins[id] == 'string') {
				return cb(null, this.b._options.builtins[id]);
			}

			origResolve.call(this.b, id, opts, cb);
		};
	}

	this.b.pipeline.get("json").unshift(through.obj(function(row, enc, next) {
		if (/package\.json$/.test(row.file)) {
			var obj = JSON.parse(row.source);

			for (var i in obj) {
				if (i.startsWith("_")) {
					delete obj[i];
				}
			}

			row.source = JSON.stringify(obj, null, 2);
		}

		this.push(row);
		next();
	}));

	this.b.plugin(watchify);

	this.b.transform(babelify, {
		ignore: this.site,
		presets: [ require("babel-preset-es2015") ],
		plugins: [ require("babel-plugin-transform-async-to-generator") ]
	});

	this.b.transform(envify({
		ENGINE: this.engine
	}));

	this.b.on("update", () => {
		debug("%s: Update triggered", this.outFile);
		this.bundle();
	});

	this.busy = false;
	this.queue = false;

	this.bundle();
};

Packer.prototype.stop = function() {
	if (!this.b) {
		return;
	}

	this.b.close();
	delete this.b;
};

Packer.prototype.extractMap = function(sourcemap, cb) {
	var skiraFolder = pathTool.resolve(__dirname, "..");

	sourcemap.mapSources(file => {
		var abs = pathTool.resolve(__dirname, file);
		var path;

		if (abs.startsWith(skiraFolder)) {
			path = abs.slice(skiraFolder.length);
		} else {
			path = "project/" + pathTool.relative(process.cwd(), abs);
		}

		return ("/skira/" + path).replace(/(\\|\/)+/g, "/");
	});

	var p = this.part + ".map";

	fs.writeFile("build/" + p, sourcemap.toJSON(), (err) => {
		if (err) return console.error(err); // TODO: proper handling
		cb(!this.isBrowser ? "//# sourceMappingURL=" + p : "");
	});
}

Packer.prototype.bundle = function() {
	if (this.busy) {
		this.queue = true;
		debug("%s: Bundle already busy...", this.outFile);
		return;
	}

	this.busy = true;

	debug("%s: Generating bundle...", this.outFile);

	var bundle = this.b.bundle();

	bundle.on("error", (err) => {
		debug("%s: Error while packing bundle: %s", this.outFile, err.message || err);
		this.busy = false;
	});

	var extractMap = mold.transform(this.extractMap.bind(this));
	var out = fs.createWriteStream(this.outFile);

	bundle.pipe(extractMap).pipe(out).on("finish", () => {
		debug("%s: Done generating bundle.", this.outFile);

		this.busy = false;
		this.emit("update");

		if (this.queue) {
			setImmediate(() => this.bundle());
		}
	});
};

module.exports = Packer;
