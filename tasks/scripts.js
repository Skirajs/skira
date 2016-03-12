const Promise = require("bluebird")

const browserify = require("browserify")
const fs = require("fs")
const watchify = require("watchify")

/**
 * Sets input and output file paths. Currently hardcoded.
 */
exports.configure = function configure() {
	this.enabled = true
	this.input = "scripts/index.js"
	this.output = this.skira.project.builds.scripts
}

/**
 * Instantiates Browserify and sets up a watchify listener.
 */
exports.init = function init() {
	this.bundler = browserify(this.input, {
		debug: true,
		cache: {},
		packageCache: {},
	})

	this.bundler.plugin(watchify)

	this.bundler.on("update", () => this.run())
}

/**
 * Starts the bundle process and waits for output to be written to disk.
 */
exports.run = Promise.coroutine(function* run() {
	var bundle = this.bundler.bundle()

	var out = fs.createWriteStream(this.output)

	bundle.pipe(out)

	return new Promise((resolve, reject) => {
		out.on("finish", resolve)
		bundle.on("error", reject)
	})
})

/**
 * Stops watchify and deletes the reference to our Browserify instance.
 */
exports.stop = function stop() {
	if (!this.bundler) {
		return
	}

	this.bundler.close()
	delete this.bundler
}
