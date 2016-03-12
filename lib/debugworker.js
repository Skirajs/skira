const pathTool = require("path")
const resolve = require("resolve")

// preload / cache some stuff
const setupServer = require("../core/server")
require("eventemitter3-collector")
require("jade/runtime")

function fancyRequire(file, dir, src) {
	try {
		return require(resolve.sync(src, { basedir: dir }))
	} catch (err) {
		try {
			return require(src)
		} catch (ignored) {}

		throw err
	}
}

var file = process.argv[2]
var dir = pathTool.dirname(file)

var data = ""

process.stdin.setEncoding("utf8")

process.stdin.on("data", (d) => data += d)

process.stdin.on("end", () => {
	var module = { exports: {} }

	new Function("exports", "require", "module", "__filename", "__dirname", data)
		(module.exports, fancyRequire.bind(null, file, dir), module, file, dir)

	setupServer(module.exports)
})
