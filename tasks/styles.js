const Promise = require("bluebird")

const chokidar = require("chokidar")
const fs = Promise.promisifyAll(require("fs"))
const less = require("less")

/**
 * Sets input and output file paths. Currently hardcoded.
 */
exports.configure = function configure() {
	this.enabled = true
	this.input = "styles/index.less"
	this.output = this.skira.project.builds.styles
}

/**
 * Sets up the watcher, initially only watching the main file.
 */
exports.init = function init() {
	// We start off watching the main input file.
	this.watcher = chokidar.watch(this.input, {
		ignoreInitial: true,
	})

	// When one of the files that we're interested in changes
	// we trigger a new build.
	this.watcher.on("change", () => this.run())

	// We keep a local copy of the files we watch.
	// Reasoning behind that is that chokidar does
	// some over the top normalization which we can
	// avoid this way.
	this.watched = []
}

/**
 * Reads the main file, compiles it to one big file and watches all references.
 */
exports.run = Promise.coroutine(function* run() {
	// read the less code
	var code = yield fs.readFileAsync(this.input, "utf8")

	try {
		// render less to css
		var output = yield less.render(code, {
			// specify the filename for imports and errors
			filename: this.input,
			// include the sourcemap for debugging
			sourceMap: {
				// do not put it in a separate file
				sourceMapFileInline: true,
			},
		})
	} catch (err) {
		err.extract.splice(2, 0, " ".repeat(err.column) + "^")

		var extract = err.extract
			// change undefined lines to empty ones
			.map((line) => line || "")
			// indent, style and mark every line
			.map((line, index) => (
				// indent every line and add an arrow on the guilty line
				"  " + (index == 1 ? ">" : " ") + " " +
				// prefix every line with a pipe character except for the cursor
				(index != 2 ? "|" : " ") + " " + line
			))
			// add an additional empty line
			.concat("")
			// create a string
			.join("\n")

		throw new Error(
			`Parsing file ${err.filename}: ${err.message}` +
			`(${err.line}:${err.column})\n${extract}`
		)
	}

	// write css output to file
	yield fs.writeFileAsync(this.output, output.css)

	var stale = this.watched
		// only keep the ones that are _not_ imports
		.filter(f => output.imports.indexOf(f) == -1)

	// stop watching the ones that aren't used anymore
	this.watcher.unwatch(stale)

	// remove the old files from our local watch list
	this.watched = this.watched
		// only keep the ones that are _not_ stale
		.filter(f => stale.indexOf(f) == -1)

	// get all imports
	var added = output.imports
		// only keep the ones that are _not_ watched yet
		.filter(f => this.watched.indexOf(f) == -1)

	// start watching all the new files
	this.watcher.add(added)

	// add all new files to our local watch list
	this.watched = this.watched
		.concat(added)
})

/**
 * Stops the watcher and deletes its reference.
 */
exports.stop = function stop() {
	if (!this.watcher) {
		return
	}

	this.watcher.close()
	delete this.watcher
}
