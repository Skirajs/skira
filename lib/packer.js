const babelify = require("babelify");
const browserify = require("browserify");
const envify = require("envify/custom");
const fs = require("fs");
const mold = require("mold-source-map");
const pathTool = require("path");
const through = require("through2");
const watchify = require("watchify");

const debug = function() {
	process.send({ debug: Array.prototype.slice.call(arguments) });
};

function Packer(part, isBrowser, engine) {
	this.debugFile = "debug/" + part + ".js";
	this.part = part;
	this.isBrowser = isBrowser;
	this.engine = engine;
}

Packer.prototype.start = function() {
	if (this.b) {
		return;
	}

	this.busy = true;

	var opts = {
		debug: true,
		basedir: __dirname,
		cache: {},
		packageCache: {},
		browserField: !!this.isBrowser,
		insertGlobalVars: this.isBrowser ? {} : {
			process: null
		}
	};

	if (!this.isBrowser) {
		opts.builtins = false;
	}

	// TODO: proper var
	this.b = browserify(this.part != "scripts" ? "../core/loader" : this.engine, opts);

	var origResolve = this.b._bresolve;

	this.b._bresolve = (id, opts, cb) => {
		//debug("it wants %s", id);

		if (id == "site") {
			cb(null, this.site);
			return;
		}

		// callback format: err, resolvedPath, pkg

		origResolve.call(this.b, id, opts, function(err, resolved, pkg) {
			if (err) {
				try {
					var p = require.resolve(id);
					cb(null, p, pkg);
					return;
				} catch (err) {
					// we couldn't find it either, let it fall through
				}
			}

			cb(err, resolved, pkg);
		});
	};

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
		debug("Update triggered");
		this.bundle();
	});

	this.busy = false;
	this.queue = false;

	this.bundle();
};

Packer.prototype.bundle = function(isDoingQueue) {
	if (this.busy) {
		this.queue = true;
		debug("Bundle already busy...");
		return;
	}

	this.busy = true;

	debug("Generating bundle...");

	var bundle = this.b.bundle();

	bundle.on("error", (err) => {
		debug("Error while packing bundle: %s", err.message || err);
		this.busy = false;
	});

	var extractMap = mold.transform(this.extractMap.bind(this));
	var out = fs.createWriteStream(this.debugFile);

	bundle.pipe(extractMap).pipe(out).on("finish", () => {
		debug("Done generating bundle.");

		this.busy = false;
		process.send({ update: true });

		if (this.queue) {
			setImmediate(() => this.bundle());
		}

		this.queue = false;
	});
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

	cb(sourcemap.toComment());
};

var a = process.argv.slice(2);
var packer = new Packer(a[0], a[1], a[2]);

process.on("message", (m) => {
	if (m.config) {
		packer.outFile = m.config.outFile;
		packer.site = m.config.site;

		packer.start();
	}
});
