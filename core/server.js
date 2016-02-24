const bodyParser = require("body-parser");
const compression = require("compression");
const connect = require("connect");
const debug = require("debug")("skira:server");
const http = require("http");
const Processor = require("./processor");
const Router = require("./router");
const st = require("st");
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

		if (data.site.project.default && data.site.project.default.locale) {
			data.locale = data.site.locales[data.site.project.default.locale];
		}
	});

	this.setupConnect();
}

Server.prototype.setupConnect = function() {
	this.app = connect();

	if (!process.env.DEBUG) {
		this.app.use(compression());
	}

	this.app.use(bodyParser.urlencoded({
		extended: true
	}));

	this.app.use(this.handle.bind(this, null));

	if (process.env.DEBUG) {
		this.app.use(this.fileHandler("debug"));
	}

	this.app.use(this.fileHandler(this.site.project.files));

	this.app.use(this.handle.bind(this, 404));
	this.app.use(this.handle.bind(this));
};

Server.prototype.fileHandler = function(opts) {
	var files = {};

	if (typeof opts == "string") {
		opts = { path: opts };
	}

	// TODO: get caching preferences from project
	// TODO: allow dot, disallow cors in project
	files.path = "public";
	files.passthrough = true; // for connect to work
	files.gzip = false; // due to compress middleware
	files.index = "index.html";
	files.dot = false;
	files.cors = true;

	for (var i in opts) {
		files[i] = opts[i];
	}

	return st(files);
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

	try {
		var output = await this.processor.render(page, req);
		res.writeHead(output.status, output.headers);
		res.end(output.content);
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

	return site;
};
