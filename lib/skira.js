const buildNav = require("./buildnav");
const debug = require("debug")("skira:toolchain");
const Formats = require("./formats");
const LessBuilder = require("less-builder");
const Packer = require("./packer");
const pathTool = require("path");
const Promise = require("bluebird");
const siteCodeGenerator = require("./codegen");
const spawn = require("child_process").spawn;
const TreeLoader = require("tree-loader");

const fs = Promise.promisifyAll(require("fs"));

function Skira(port) {
	this.port = port;
	this.sitePath = pathTool.resolve("debug/.site.js");

	this.packers = [
		//new Packer(true, "../core/browser"),
		new Packer(false, "../core/server", this.sitePath, "debug/server.js")
	];

	this.setupLessBuilder();

	return this.setupLoaders();
}

Skira.prototype.setupLoaders = Promise.coroutine(function *() {
	this.loaders = {};

	yield Promise.join(
		this.setupLoader("locales", Formats.yaml),
		this.setupLoader("pages", Formats.page),
		this.setupLoader("views", Formats.jade),
		this.setupLoader("project", Formats.skira, true)
	);

	this.ready = true;
	yield this.exportSite();

	debug("Starting code packer...");

	for (var packer of this.packers) {
		packer.on("update", this.setupServer.bind(this));
		packer.start();
	}

	return this;
});

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

	return new Promise((resolve, reject) => {
		this.loaders[name].once("change", resolve);
	});
};

Skira.prototype.setupServer = function() {
	if (this.server) {
		this.server.kill();
	}

	debug("(Re)starting server instance...");

	this.server = spawn("node", [ "debug/server" ], {
		env: { PORT: this.port || 0, DEBUG: process.env.DEBUG },
		stdio: "inherit"
	});
};

Skira.prototype.setupLessBuilder = function() {
	if (this.lessbuilder) {
		this.lessbuilder.stop();
	}

	debug("Setting up LESS builder...");
	this.lessbuilder = new LessBuilder("styles/index.less", "public/styles.css", false);
};

module.exports = Skira;
