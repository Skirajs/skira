const browserify = require("browserify")
const fs = require("fs")
const pathTool = require("path")
const Readable = require("stream").Readable

function makeEntryStream(sitePath) {
	let rs = new Readable()

	rs.push("let Site = require('skira-core')\n")
	rs.push("let data = require(" + JSON.stringify(sitePath) + ")\n")
	rs.push("let site = new Site(data)\n")
	rs.push("console.log(site.resolve('/'))\n")
	rs.push(null)

	return rs
}

function AppTask() {
}

module.exports = AppTask

AppTask.prototype.triggers = {
	after: "site",
}

AppTask.prototype.filter = function filter(skira) {
	return skira.project && skira.project.app
}

AppTask.prototype.prepare = function prepare(skira) {
	let rs = makeEntryStream(process.cwd() + "/" + skira.project.builds.site)

	let bundler = browserify({
		debug: true,
		basedir: process.cwd(),
		entries: rs,
		cache: {},
		packageCache: {},
	})

	bundler.plugin(require("bundle-collapser/plugin"))

	this.bundler = bundler
}

AppTask.prototype.execute = async function execute(skira) {
	await new Promise((resolve, reject) => {
		this.bundler
			.bundle()
			.on("error", reject)
			.pipe(fs.createWriteStream(skira.project.builds.app))
			.on("finish", resolve)
	})
}
