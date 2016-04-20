const browserify = require("browserify")
const chokidar = require("chokidar")
const derequire = require("derequire")
const fs = require("fs-promise")
const globby = require("globby")
const pathTool = require("path")
const Readable = require("stream").Readable
const yaml = require("js-yaml")

function randomString() {
	return Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 18)
}

async function globObjects(objects) {
	let parts = Object.keys(objects)

	let globTasks = parts
		.map(part => globby(objects[part], { cwd: process.cwd() + "/" + part }))

	let results = await Promise.all(globTasks)

	let globbedObjects = {}

	for (let i in parts) {
		let part = parts[i]
		globbedObjects[part] = results[i]
	}

	return globbedObjects
}

function makeEntryStream(objects, project, placeholder) {
	let rs = new Readable()
	rs.file = process.cwd() + "/site.js"

	rs.push("exports.project = " + JSON.stringify(project) + "\n")

	for (let objName in objects) {
		rs.push("exports[" + JSON.stringify(objName) + "] = {}\n")

		for (let path of objects[objName]) {
			let nameEsc = JSON.stringify(removeExt(path.replace(/^\.\//, "")))
			let pathEsc = JSON.stringify("./" + objName + "/" + path)

			rs.push("exports[" + JSON.stringify(objName) + "][" + nameEsc + "] = require(" + pathEsc + ")\n")
		}
	}

	rs.push("exports.modules = {}\n")

	for (let moduleMount in project.modules) {
		let moduleUri = project.modules[moduleMount] || moduleMount
		rs.push("exports.modules[" + JSON.stringify(moduleMount) + "] = function importModule() { return " + placeholder + "(" + JSON.stringify(moduleUri) + "); }\n")
	}

	rs.push(null)

	return rs
}

function removeExt(path) {
	return path.slice(0, -pathTool.extname(path).length)
}

function SiteTask() {
}

module.exports = SiteTask

SiteTask.prototype.REQUIRE_PLACEHOLDER = "futurequire_" + randomString()

SiteTask.prototype.OBJECTS = {
	locales: "**/*.yaml",
	views: "**/*.jade",
	pages: "**/*.yaml",
}

SiteTask.prototype.triggers = {
	after: "project",
	watch: ["locales", "pages", "views"],
}

SiteTask.prototype.execute = async function execute(skira) {
	let objects = await globObjects(this.OBJECTS)
	let rs = makeEntryStream(objects, skira.project, this.REQUIRE_PLACEHOLDER)

	let bundler = browserify({
		debug: true,
		cache: {},
		packageCache: {},
		entries: rs,
		bundleExternal: false,
		standalone: "site",
	})

	bundler.plugin(require("bundle-collapser/plugin"))

	bundler.transform(require("yamlify"))
	bundler.transform(require("jadeify"), {
		runtimePath: require.resolve("jade/runtime").replace(/\\/g, "/"),
	})

	let buf = await new Promise((resolve, reject) => {
		bundler.bundle((err, buf) => {
			if (err) {
				reject(err)
				return
			}

			resolve(buf)
		})
	})

	let code = buf.toString()

	code = derequire(code).replace(this.REQUIRE_PLACEHOLDER, "require")

	await fs.writeFile(skira.project.builds.site, code)
}
