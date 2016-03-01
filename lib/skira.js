const Promise = require("bluebird");

const buildNav = require("./buildnav");
const debug = require("debug")("skira:toolchain");
const Formats = require("./formats");
const fs = Promise.promisifyAll(require("fs"));
const LessBuilder = require("less-builder");
const lessDebug = require("debug")("skira:lessbuilder");
const Packer = require("./packer");
const parserDebug = require("debug")("skira:parser");
const pathTool = require("path");
const siteCodeGenerator = require("./codegen");
const spawn = require("child_process").spawn;
const TreeLoader = require("tree-loader");

function Skira(port) {
	this.port = port;
	this.start();
}

Skira.prototype.start = Promise.coroutine(function *() {
	this.sitePath = pathTool.resolve("build/site.js");

	this.packers = {};

	this.packers.scripts = new Packer("scripts", true, require.resolve(pathTool.resolve("scripts")));
	this.packers.app = new Packer("app", true, "../core/browser", this.sitePath);
	this.packers.server = new Packer("server", false, "../core/server", this.sitePath, "build/server.js");

	this.packers.server.on("update", () => this.setupServer());
	this.setupServer();

	this.loaders = {};

	yield Promise.join(
		this.setupLoader("locales", Formats.yaml),
		this.setupLoader("pages", Formats.page),
		this.setupLoader("views", Formats.jade),
		this.setupLoader("project", Formats.skira, true)
	);

	this.loaders.project.on("change", () => this.togglePackers());
	this.togglePackers();

	this.ready = true;

	yield this.exportSite();
	yield this.setupLessBuilder();
});

Skira.prototype.togglePackers = function() {
	var project = this.site("project");

	this.packers.scripts.outFile = project.output.scripts;
	this.packers.app.outFile = project.output.app;

	this.packers.server[project.app !== true ? "start" : "stop"]();
	this.packers.app[project.app ? "start" : "stop"]();
	this.packers.scripts[project.output.scripts ? "start" : "stop"]();
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

	site.nav = buildNav(site.pages);

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

	this.server = spawn("node", [ this.packers.server.outFile ], {
		env: { PORT: this.port || 0, DEBUG: process.env.DEBUG },
		stdio: "inherit"
	});
};

Skira.prototype.setupLessBuilder = Promise.coroutine(function *() {
	if (this.lessbuilder) {
		this.lessbuilder.stop();
	}

	debug("Setting up LESS builder...");

	var out = this.site("project").output.styles;
	var map = "build/styles.map";

	this.lessbuilder = new LessBuilder("styles/index.less", out, map);

	this.lessbuilder.on("start", () => {
		lessDebug("Compiling LESS files...");
	});

	this.lessbuilder.on("error", (err) => {
		lessDebug("Error in LESS files: %s", err.message || err);
	});

	this.lessbuilder.on("end", () => {
		lessDebug("Done compiling LESS files.");
	});

	this.lessbuilder.startBuild();
});

module.exports = Skira;
