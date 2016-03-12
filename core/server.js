const Promise = require("bluebird")

const bodyParser = require("body-parser")
const compression = require("compression")
const connect = require("connect")
const Cookies = require("cookies")
const fs = Promise.promisifyAll(require("fs"))
const http = require("http")
const Processor = require("./processor")
const Router = require("./router")
const st = require("st")
const Url = require("url")

function Server(site) {
	this.site = site
	this.processor = new Processor(site)
	this.router = new Router(site)

	this.router.mapJumpRoutes()

	this.site.on("prepare", function addDefaultHeaders(data) {
		data.headers["Content-Type"] = "text/html; charset=utf-8"
		data.headers.Connection = "close"
		data.headers.Server = "Skira"
	})

	this.setupConnect()
}

Server.prototype.setupConnect = function setupConnect() {
	this.app = connect()

	this.app.use(compression())

	this.app.use(bodyParser.urlencoded({
		extended: true,
	}))

	this.app.use(Cookies.connect())

	this.app.use((req, res, next) => this.handle(null, req, res, next))

	this.app.use(this.fileHandler())

	this.app.use((req, res, next) => this.handle(404, req, res, next))
	this.app.use((err, req, res, next) => this.handle(err, req, res, next))
}

Server.prototype.fileHandler = function fileHandler() {
	var opts = {}

	// we need this option or the file handler will serve our 404s
	opts.passthrough = true

	for (var i in this.site.project.files) {
		opts[i] = this.site.project.files[i]
	}

	if (process.env.DEBUG) {
		opts.cache = false
	}

	return st(opts)
}

Server.prototype.handle = Promise.coroutine(function* handle(err, req, res, next) {
	if (err === 404) {
		err = new Error("Page not found")
		err.httpCode = 404
	}

	if (err && !err.httpCode) {
		err.httpCode = 500
	}

	var url = Url.parse(req.url)
	var path = err ? "error-" + err.httpCode : url.pathname

	var page = this.router.resolve(path)

	if (!page) {
		next(err)
		return
	}

	page.status = (err ? err.httpCode : 0) || 200
	page.request = req

	try {
		var output = yield this.processor.render(page, req)
		res.writeHead(output.status, output.headers)

		var c = output.content
		res.end(typeof c != "string" ? JSON.stringify(c) : c)
	} catch (err) {
		next(err)
	}
})

Server.prototype.start = function start(network, callback) {
	if (this.httpServer && this.httpServer.address()) {
		this.stop(this.start.bind(this, callback))
		return
	}

	this.httpServer = http.createServer(this.app)
	this.httpServer.listen(network, "127.0.0.1", () => callback(this.httpServer))
}

Server.prototype.stop = function stop(callback) {
	this.httpServer.close(callback)
}

module.exports = function setupServer(site) {
	var server = new Server(site)

	server.start(process.env.PORT, (s) => {
		process.send({ address: s.address() })
	})
}
