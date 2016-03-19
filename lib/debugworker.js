// preload / cache some stuff
const setupServer = require("../core/server")
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

process.on("message", (m) => {
	console.log(m)
	if (m.start) {
		var site = require(process.cwd() + "/build/site.js")
		setupServer(site)
	}
})
