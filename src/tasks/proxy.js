const http = require("http")
const st = require("st")
const url = require("url")

function proxyRequest(addr, req, res) {
	return new Promise((resolve, reject) => {
		let options = {
			hostname: addr.address,
			port: addr.port,
			path: req.url,
			method: req.method,
			headers: req.headers,
		}

		let proxyReq = http.request(options, (proxyRes) => {
			res.writeHead(proxyRes.statusCode, proxyRes.headers)
			proxyRes.pipe(res)
		})

		req.pipe(proxyReq)

		res.on("end", resolve)
		proxyReq.on("error", reject)
	})
}

function ProxyTask() {
}

module.exports = ProxyTask

ProxyTask.prototype.triggers = {
	after: !process.env.BUILD && "project",
}

ProxyTask.prototype.prepare = function prepare(skira) {
	this.proxy = http.createServer((req, res) => {
		this.handler(skira, req, res)
	})

	this.fileHandler = st({
		path: process.cwd(),
		cache: false,
		index: false,
		dot: true,
		gzip: false,
	})
}

ProxyTask.prototype.execute = async function execute(skira) {
	// We resolve it as we might need to wait for the portfinder.
	this.port = await Promise.resolve(skira.port)

	this.outputs = {}

	// Get all Skira parts that have an output.
	Object.keys(skira.project.output || {})
		// Map both name and value to an array for easy access.
		.map((n) => [n, skira.project.output[n]])
		// Only keep absolute URLs as they denote public access.
		.filter((o) => o[1].startsWith("/"))
		// Reverse map every URL back to its partname
		.forEach((o) => {
			this.outputs[o[1]] = skira.project.builds[o[0]]
		})

	await new Promise((resolve) => {
		this.proxy.listen(this.port, "127.0.0.1", resolve)
	})

	this.href = url.format({
		protocol: "http",
		hostname: this.proxy.address().address,
		port: this.proxy.address().port,
		pathname: "/",
	})
}

ProxyTask.prototype.cleanup = async function cleanup() {
	await new Promise((resolve) => {
		this.proxy.close(resolve)
	})
}

ProxyTask.prototype.handler = async function handler(skira, req, res) {
	// intercept if its an output we can serve from our build directory
	// we specially don't parse the URL so you can use a query string to bypass the proxy
	if (this.outputs[req.url]) {
		req.url = "/" + this.outputs[req.url]
		this.fileHandler(req, res)
		return
	}

	try {
		if (!skira.tasks.server || !skira.tasks.server.address) {
			let err = new Error("Not started yet")
			err.code = "WARMINGUP"
			throw err
		}

		let addr = skira.tasks.server.address
		await proxyRequest(addr, req, res)
	} catch (err) {
		try {
			res.writeHead(503, {
				"Content-Type": "text/plain; charset=utf-8",
				Connection: "Close",
				Refresh: "1",
			})

			res.end("Could not connect to backend.\r\n\r\n" + err.stack)
		} catch (err2) {
			console.error("Could not send error:", err.stack || err)
		}
	}
}
