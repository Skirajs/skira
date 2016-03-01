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

Server.prototype.setupConnect = function() {
	this.app = connect();

	this.app.use(compression());

	this.app.use(bodyParser.urlencoded({
		extended: true
	}));

	this.app.use(Cookies.connect());

	this.app.use((req, res, next) => this.handle(null, req, res, next));

	if (process.env.DEBUG) {
		var prefix = (this.site.project.files.path + "/").replace(/\/+/g, "/");

		for (var i in this.site.project.output) {
			var path = new String(this.site.project.output[i]);

			if (!path.startsWith(prefix)) {
				continue;
			}

			var m = "/" + path.slice(prefix.length);
			this.app.use(m, this.addSourceMap.bind(this, i));
		}
	}

	this.app.use(this.fileHandler(process.env.DEBUG));

	this.app.use((req, res, next) => this.handle(404, req, res, next));
	this.app.use((err, req, res, next) => this.handle(err, req, res, next));
};

Server.prototype.addSourceMap = function(part, req, res, next) {
	var prefix = "# sourceMappingURL=data:application/json;base64,";
	var promisedMap = fs.readFileAsync("build/" + part + ".map");

	res.filter = through2(function write(data, enc, cb) {
		cb(null, data);
	}, function end(cb) {
		promisedMap.then((d) => {
			var c = prefix + d.toString("base64");
			this.push(part == "styles" ? "/*" + c + " */\n" : "//" + c);
			cb();
		}).catch(next);
	});

	next();
};

Server.prototype.fileHandler = function(debugMode) {
	var opts = {};

	opts.passthrough = true; // for connect to work

	for (var i in this.site.project.files) {
		opts[i] = this.site.project.files[i];
	}

	if (debugMode) {
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
};
