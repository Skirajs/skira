var browserify = require("browserify");
var Formats = require("./formats");
var jade = require("jade");
var LessBuilder = require("less-builder");
var pathToRegexp = require("path-to-regexp");
var Promise = require("bluebird");
var serialize = require("serialize-javascript");
var Server = require("skira-server");
var stream = require("stream");
var TreeLoader = require("tree-loader");

var VIEW_RUNTIME_CODE = "require('jade/runtime')";
var fs = Promise.promisifyAll(require("fs"));

function Skira() {
	this.site = {};
	this.site.viewRuntime = eval(VIEW_RUNTIME_CODE);

	this.setupLoaders();
}

Skira.prototype.setupLoaders = function() {
	var _this = this;

	this.loaders = {};
	this.initQueue = [];

	this.setupLoader("locales", Formats.yaml);
	this.setupLoader("pages", Formats.yaml);
	this.setupLoader("views", Formats.jade);
	this.setupLoader("config", Formats.yaml, true);

	this.loaders.config.on("change", this.setupLessBuilder.bind(this));
	this.loaders.pages.on("change", this.rebuildNav.bind(this));

	Promise.all(this.initQueue).then(function() {
		_this.ready = true;
		_this.exportSite();
		_this.setupServer();
		
		_this.loaders.pages.on("change", _this.parseRoutes.bind(_this));

		_this.loaders.config.on("change", function() {
			setImmediate(_this.setupServer.bind(_this));
		});
	});
};

Skira.prototype.exportSite = function() {
	if (!this.ready) {
		return;
	}

	var site = {};

	for (var i in this.site) {
		if (i == "viewRuntime") {
			site[i] = "[viewRuntime placeholder " + Math.random() + "]";
			continue;
		}

		site[i] = this.site[i];
	}

	var s = new stream.Readable();
	var objStr = serialize(site);

	s.push("module.exports=(");
	s.push(objStr.replace("\"" + site.viewRuntime + "\"", VIEW_RUNTIME_CODE));
	s.push(");\n");
	s.push(null);

	var b = browserify({ basedir: __dirname });
	b.require(s, { expose: "site" });
	var bundle = b.bundle();

	var out = fs.createWriteStream("site.js");
	bundle.pipe(out, { end: false });
	bundle.on("end", function() {
		out.write("module.exports = require(\"site\");\n");
		out.end();
	});
};

Skira.prototype.parseRoutes = function(pageName) {
	var pages = pageName ? [ pageName ] : Object.keys(this.site.pages);

	for (var i in pages) {
		var page = this.site.pages[pages[i]];

		if (!page.routes) {
			continue;
		}

		page._routes = page.routes.map(function(pathStr) {
			var keys = [];
			var regex = pathToRegexp(pathStr, keys);
			regex.keys = keys;
			return regex;
		});
	}

	try {
		this.server.router.mapJumpRoutes();
	} catch (err) {}
};

Skira.prototype.setupLoader = function(name, format, single) {
	var _this = this;

	var file = name;

	if (single && format && format.extension) {
		file += "." + format.extension;
	}

	this.loaders[name] = new TreeLoader(file, format, single);
	this.loaders[name].on("change", this.exportSite.bind(this));

	this.initQueue.push(new Promise(function(resolve, reject) {
		_this.loaders[name].once("change", resolve);
	}));

	var opts = {};
	opts.enumerable = true;
	opts.get = function() {
		return _this.loaders[name].tree;
	};

	Object.defineProperty(this.site, name, opts);
};

Skira.prototype.setupServer = function() {
	if (!this.server) {
		this.server = new Server(this.site);
	}

	this.server.start(function(addr) {
		console.log("Listening on %s:%d", addr.address, addr.port);
	});
};

Skira.prototype.setupLessBuilder = function() {
	if (this.lessbuilder) {
		this.lessbuilder.stop();
	}

	this.lessbuilder = new LessBuilder(
		this.site.config.less.entry,
		this.site.config.less.output,
		this.site.config.debug
	);
};

Skira.prototype.rebuildNav = function() {
	var nav = {};

	for (var pageName in this.site.pages) {
		var page = this.site.pages[pageName];

		if (!page.navorder) {
			continue;
		}

		for (var navName in page.navorder) {
			if (typeof nav[navName] == "undefined") {
				nav[navName] = [];
			}

			nav[navName].push(page);
		}
	}

	for (var navName in nav) {
		nav[navName].sort(function(pageA, pageB) {
			return pageA.navorder[navName] - pageB.navorder[navName];
		});
	}

	for (var navName in nav) {
			nav[navName] = nav[navName].map(function(page) {
			var stripped = {};

			stripped.href = page.href;
			stripped.title = page.title;

			return stripped;
		});
	}

	this.site.nav = nav;
};

module.exports = Skira;
