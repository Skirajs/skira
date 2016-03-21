const Promise = require("bluebird")

const compile = require("../lib/compiler")
const Formats = require("../lib/formats")
const fs = Promise.promisifyAll(require("fs"))
const TreeLoader = require("tree-loader")

/**
 * Sets up a TreeLoader for every Skira part to monitor all files and keep
 * a (parsed) in-memory copy so it can quickly export the site on changes.
 *
 * @param {string} name - Part name (but for TreeLoader it's just the directory)
 * @param {object} format - Describes how the files should be filtered and parsed
 */
function setupLoader(name, format) {
	this.loaders[name] = new TreeLoader(name, format)

	return new Promise((resolve, reject) => {
		this.loaders[name].once("change", resolve)
	})
}

/**
 * Sets input file path.
 */
exports.configure = function configure() {
	this.enabled = true
	this.output = this.skira.project.builds.site
}

/**
 * Sets up all loaders, waits for them to be ready, then starts listening
 * for file changes so it can rebuild the site.
 */
exports.init = Promise.coroutine(function* init() {
	this.loaders = {}

	yield Promise.join(
		setupLoader.call(this, "locales", Formats.yaml),
		setupLoader.call(this, "pages", Formats.page),
		setupLoader.call(this, "views", Formats.jade)
	)

	for (var i in this.loaders) {
		this.loaders[i].on("change", () => this.run())
	}
})

/**
 * Collects all (parsed) data, compiles it to JS and writes it to disk.
 */
exports.run = Promise.coroutine(function* run() {
	for (var loaderName in this.loaders) {
		var errorObj = this.loaders[loaderName].error

		var errorArr = Object.keys(errorObj)
			.map(name => errorObj[name])
			.filter(Boolean)

		this.error = this.error.concat(errorArr)
	}

	if (this.error.length) {
		return
	}

	var site = {
		project: this.skira.project,
	}

	for (var i in this.loaders) {
		site[i] = this.loaders[i].tree
	}

	var code = compile(site)

	yield fs.writeFileAsync(this.output, code)
})

/**
 * Tells all TreeLoaders to stop watching for changes and deletes them.
 */
exports.stop = function stop() {
	if (!this.loaders) {
		return
	}

	for (var i in this.loaders) {
		this.loaders[i].stop()
		delete this.loaders[i]
	}
}
