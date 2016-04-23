const browserify = require("browserify")
const fs = require("fs")

function ScriptsTask() {
}

module.exports = ScriptsTask

ScriptsTask.prototype.BABEL_RC = {
	extends: __dirname + "/../../scripts.babelrc.json",
}

ScriptsTask.prototype.triggers = {
	after: "project",
	watch: "scripts",
}

ScriptsTask.prototype.prepare = function prepare() {
	let bundler = browserify({
		debug: true,
		entries: "scripts/index.js",
	})

	bundler.plugin(require("bundle-collapser/plugin"))

	bundler.transform(require("babelify"), this.BABEL_RC)
	bundler.transform(require("yamlify"))
	bundler.transform(require("jadeify"), {
		runtimePath: require.resolve("jade/runtime").replace(/\\/g, "/"),
	})

	this.bundler = bundler
}

ScriptsTask.prototype.execute = async function execute(skira) {
	await new Promise((resolve, reject) => {
		this.bundler
			.bundle()
			.on("error", reject)
			.pipe(fs.createWriteStream(skira.project.builds.scripts))
			.on("finish", resolve)
	})
}
