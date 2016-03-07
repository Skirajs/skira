const Promise = require("bluebird");

const bodyParser = require("body-parser");
const compression = require("compression");
const connect = require("connect");
const Cookies = require("cookies");
const debug = require("debug")("skira:server");
const fs = Promise.promisifyAll(require("fs"));
const http = require("http");
const Processor = require("./processor");
const Router = require("./router");
const st = require("st");
const through2 = require("through2");
const Url = require("url");

function Server(site) {
	this.site = site;
	this.processor = new Processor(site);
	this.router = new Router(site);

	this.router.mapJumpRoutes();

	this.site.on("prepare", function addDefaultHeaders(data) {
		data.headers["Content-Type"] = "text/html; charset=utf-8";
		data.headers["Connection"] = "close";
		data.headers["Server"] = "Skira";
	});

	this.setupConnect();
}

function debugServer() {
	var serve = st({
		passthrough: true,
		path: "debug",
		cache: false,
		gzip: false,
		cors: false
	});

	var o = this.site.project.output;
	var reverseMapping = Object.keys(o).map(i => o[i]);

	return (req, res, next) => {
		var parsed = Url.parse(req.url);
		var part = reverseMapping[parsed.pathname];

		if (typeof part == "undefined") {
			next();
			return;
		}

		var originalUrl = req.url;
		req.url = "/" + part + (part == "styles" ? ".css" : ".js"); // TODO: lookup full name from object

		serve(req, res, () => {
			req.url = originalUrl;
			next();
		});
	};
}

Server.prototype.setupConnect = function() {
	this.app = connect();

	this.app.use(compression());

	this.app.use(bodyParser.urlencoded({
		extended: true
	}));

	this.app.use(Cookies.connect());

	this.app.use((req, res, next) => this.handle(null, req, res, next));

	if (process.env.DEBUG) {
		this.app.use(debugServer.call(this));
	}

	this.app.use(this.fileHandler());

	this.app.use((req, res, next) => this.handle(404, req, res, next));
	this.app.use((err, req, res, next) => this.handle(err, req, res, next));
};

Server.prototype.fileHandler = function() {
	var opts = {};

	opts.passthrough = true; // for connect to work

	for (var i in this.site.project.files) {
		opts[i] = this.site.project.files[i];
	}

	if (process.env.DEBUG) {
		opts.cache = false;
	}

	return st(opts);
};

Server.prototype.handle = async function(err, req, res, next) {
	if (err === 404) {
		err = new Error("Page not found");
		err.httpCode = 404;
	}

	if (err && !err.httpCode) {
		err.httpCode = 500;
	}

	var url = Url.parse(req.url);
	var path = err ? "error-" + err.httpCode : url.pathname;

	var page = this.router.resolve(path);

	if (!page) {
		next(err);
		return;
	}

	page.status = (err ? err.httpCode : 0) || 200;
	page.request = req;

	try {
		var output = await this.processor.render(page, req);
		res.writeHead(output.status, output.headers);

		var c = output.content;
		res.end(typeof c != "string" ? JSON.stringify(c) : c);
	} catch (err) {
		next(err);
	}
};

Server.prototype.start = function(network, callback) {
	if (this.httpServer && this.httpServer.address()) {
		this.stop(this.start.bind(this, callback));
		return;
	}

	this.httpServer = http.createServer(this.app);
	this.httpServer.listen(network, () => callback(this.httpServer));
};

Server.prototype.stop = function(callback) {
	this.httpServer.close(callback);
};

module.exports = function(site) {
	var server = new Server(site);

	server.start(process.env.PORT, function(s) {
		debug("Listening on port %d.", s.address().port);
	});
};
