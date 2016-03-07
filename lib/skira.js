const Promise = require("bluebird");

const debug = require("debug")("skira:toolchain");
const fork = require("child_process").fork;
const Formats = require("./formats");
const fs = Promise.promisifyAll(require("fs"));
const lessDebug = require("debug")("skira:styles");
const parserDebug = require("debug")("skira:parser");
const pathTool = require("path");
const siteCodeGenerator = require("./codegen");
const TreeLoader = require("tree-loader");

const PACKER_CONFIGS = {
	server: {
		filter: (p => p.app !== true),
		engine: "../core/server",
		file: "debug/server.js"
	},
	app: {
		filter: (p => !!p.app),
		engine: "../core/browser",
		file: (p => p.output.app),
		browser: true
	},
	scripts: {
		filter: (p => !!p.output.scripts),
		engine: (p => require.resolve(pathTool.resolve("scripts"))),
		file: (p => p.output.scripts),
		browser: true
	}
};

function Skira(port) {
	this.loaders = {};
	this.packers = {};

	this.port = port;
	this.start();
}

Skira.prototype.start = Promise.coroutine(function *() {
	this.setupServer();

	this.sitePath = pathTool.resolve("debug/site.js");

	yield this.setupLoader("project", Formats.skira, true);

	// async, spawns process
	this.setupLessBuilder();

	// setup packers
	this.loaders.project.on("change", () => this.togglePackers());
	this.togglePackers();

	this.packers.server.on("message", (m) => m.update && this.setupServer());

	yield Promise.join(
		this.setupLoader("locales", Formats.yaml),
		this.setupLoader("pages", Formats.page),
		this.setupLoader("views", Formats.jade)
	);

	this.ready = true;

	yield this.exportSite();
});

Skira.prototype.togglePackers = function() {
	var mod = require.resolve("./packer");
	var p = this.site("project");

	for (var packer in PACKER_CONFIGS) {
		var c = PACKER_CONFIGS[packer];

		if (c.filter && !c.filter(p)) {
			this.packers[packer] && this.packers[packer].kill();
			continue;
		}

		if (!this.packers[packer]) {
			var args = [];

			args.push(packer);
			args.push(c.browser ? "1" : "");
			args.push(typeof c.engine == "function" ? c.engine(p) : c.engine);

			this.packers[packer] = fork(mod, args);
			this.packers[packer].on("message", function(debug, m) {
				if (m.debug) {
					debug.apply(debug, m.debug);
				}
			}.bind(this, require("debug")("skira:packer:" + packer)));
		}

		var config = {};

		config.outFile = typeof c.file == "function" ? c.file(p) : c.file;
		config.site = this.sitePath;

		this.packers[packer].send({ config: config });
	}

	this.lessBuilder.send({ config: { out: "debug/styles.css" } });
};

Skira.prototype.site = function(part) {
	return this.loaders[part].tree;
};

Skira.prototype.exportSite = function() {
	if (!this.ready) {
		return;
	}

	debug("Generating site code...");

	var site = {};

	for (var name in this.loaders) {
		site[name] = this.loaders[name].tree;
	}

	var code = siteCodeGenerator(site);

	debug("Saving site to disk...");

	return fs.writeFileAsync(this.sitePath, code);
};

Skira.prototype.setupLoader = function(name, format, single) {
	var file = name;

	if (single && format && format.extension) {
		file += "." + format.extension;
	}

	this.loaders[name] = new TreeLoader(file, format, single);
	this.loaders[name].on("change", () => this.exportSite());
	this.loaders[name].on("error", function(err, file) {
		var path = pathTool.join(this.path, file);
		var f = pathTool.relative(process.cwd(), path).replace(/\\/g, "/");

		parserDebug("Error while loading %s: %s", f, err.message || err);
	});

	return new Promise((resolve, reject) => {
		this.loaders[name].once("change", resolve);
	});
};

Skira.prototype.setupServer = function(packer) {
	if (this.server) {
		this.server.kill();
	}

	debug("(Re)starting server instance...");

	this.server = fork(require.resolve("./debugworker"), [ process.cwd() + "/" + PACKER_CONFIGS.server.file ], {
		env: { PORT: this.port || 0, DEBUG: process.env.DEBUG }
	});
};

Skira.prototype.setupLessBuilder = function() {
	this.lessBuilder = fork(require.resolve("./lessbuilder"));

	this.lessBuilder.on("message", (m) => {
		if (m.debug) {
			lessDebug.apply(lessDebug, m.debug);
		}
	});
};

module.exports = Skira;
