const Server = require("../core/server")
const serializeError = require("serialize-error")

// preload / cache some stuff
require("eventemitter3-collector")
require("jade/runtime")

var original = module.constructor.prototype.require
var resolve = require.resolve

module.constructor.prototype.require = function require(path) {
	try {
		return original.call(this, path)
	} catch (err) {
		try {
			return original.call(this, resolve(path))
		} catch (ignored) {
			throw err
		}
	}
}

process.on("uncaughtException", (err) => {
	process.send({ error: serializeError(err) })
})

process.on("message", (m) => {
	if (m.start) {
		var site = require(process.cwd() + "/build/site.js")

		var server = new Server(site)

		server.start(0, (s) => {
			process.send({ address: s.address() })
		})
	}
})
