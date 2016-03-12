const Promise = require("bluebird")

const http = require("http")
const moment = require("moment")
const openurl = require("openurl")
const st = require("st")
const url = require("url")

/**
 * Proxies a request to the server after we checked it wasn't a build file
 *
 * @param {object} req - Incoming request.
 * @param {object} res - Outgoing response.
 */
function proxyRequest(req, res) {
	return new Promise((resolve, reject) => {
		if (!this.skira.tasks.server || !this.skira.tasks.server.address) {
			var err = new Error("Not started yet")
			err.code = "WARMINGUP"
			throw err
		}

		var addr = this.skira.tasks.server.address

		var options = {
			hostname: addr.address,
			port: addr.port,
			path: req.url,
			method: req.method,
			headers: req.headers,
		}

		var proxyReq = http.request(options, (proxyRes) => {
			res.writeHead(proxyRes.statusCode, proxyRes.headers)
			proxyRes.pipe(res)
		})

		req.pipe(proxyReq)

		res.on("end", resolve)
		proxyReq.on("error", reject)
	})
}

/**
 * Initial handler which checks if we should serve a file or proxy.
 *
 * @param {object} req - Incoming request.
 * @param {object} res - Outgoing response.
 */
const handler = Promise.coroutine(function* handler(req, res) {
	if (req.url == "/skira") {
		res.writeHead(200, {
			"Content-Type": "text/plain; charset=utf-8",
			Connection: "Close",
			Refresh: "1",
		})

		var info = []

		info.push(`Skira ${this.skira.VERSION}`)
		info.push("")

		for (var taskName in this.skira.tasks) {
			var task = this.skira.tasks[taskName]

			info.push(`----- ${taskName} -----`)
			info.push(`enabled: ${task.enabled}`)
			info.push(`busy: ${task.busy}`)
			info.push(`queued: ${task.queued}`)
			info.push(`error: ${task.error}`)
			info.push(`last run: ${moment(task.lastrun).format()}`)
			info.push(`last update: ${moment(task.lastupdate).format()}`)
			info.push("")
		}

		res.end(info.join("\r\n"))

		return
	}

	// intercept if its an output we can serve from our build directory
	// we specially don't parse the URL so you can use a query string to bypass the proxy
	if (this.outputs[req.url]) {
		req.url = "/" + this.outputs[req.url]
		this.fileHandler(req, res)
		return
	}

	try {
		// yield so we get all errors if any
		yield proxyRequest.call(this, req, res)
	} catch (err) {
		try {
			res.writeHead(503, {
				"Content-Type": "text/plain; charset=utf-8",
				Connection: "Close",
				Refresh: "1",
			})

			res.end("Could not connect to backend.\r\n\r\n" + err.stack)
		} catch (err2) {
			console.log("Could not send error:", err.stack || err)
		}
	}
})

/**
 * Maps some values from the Skira instance to our task.
 *
 * @param {object} project - Skira project
 */
exports.configure = Promise.coroutine(function* configure(project) {
	this.enabled = true

	// We yield it as we might need to wait for the portfinder.
	this.port = yield Promise.resolve(this.skira.port)

	this.outputs = {}

	// Get all Skira parts that have an output.
	Object.keys(this.skira.project.output)
		// Map both name and value to an array for easy access.
		.map(n => [n, this.skira.project.output[n]])
		// Only keep absolute URLs as they denote public access.
		.filter(o => o[1].startsWith("/"))
		// Reverse map every URL back to its partname
		.forEach(o => {
			this.outputs[o[1]] = this.skira.project.builds[o[0]]
		})
})

/**
 * Defines the proxy server.
 */
exports.init = function init() {
	this.proxy = http.createServer((req, res) => {
		handler.call(this, req, res)
	})

	this.fileHandler = st({
		path: process.cwd(),
		cache: false,
		index: false,
		dot: true,
		gzip: false,
	})
}

/**
 * Starts listening on the main port for connections.
 */
exports.run = function run() {
	return new Promise((resolve, reject) => {
		this.proxy.listen(this.port, "127.0.0.1", () => {
			var href = url.format({
				protocol: "http",
				hostname: this.proxy.address().address,
				port: this.proxy.address().port,
				pathname: "/skira",
			})

			console.error("Available at", href)
			openurl.open(href)

			resolve()
		})
	})
}

/**
 * Closes the network socket.
 */
exports.stop = function stop() {
	return new Promise((resolve, reject) => {
		this.proxy.close(resolve)
	})
}
