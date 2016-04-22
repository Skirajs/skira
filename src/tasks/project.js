const fs = require("fs-promise")
const merge = require("deepmerge")
const yaml = require("js-yaml")

function ProjectTask() {
}

module.exports = ProjectTask

ProjectTask.prototype.DEFAULTS = {
	output: {
		app: "/app.js",
		scripts: "/scripts.js",
		styles: "/styles.css",
	},
	builds: {
		app: "build/app.js",
		scripts: "build/scripts.js",
		site: "build/site.js",
		styles: "build/styles.css",
	},
}

ProjectTask.prototype.triggers = {
	auto: true,
	watch: "project.skira",
}

ProjectTask.prototype.execute = async function execute(skira) {
	let content = await fs.readFile("project.skira", "utf8")
	let project = content ? yaml.safeLoad(content) : {}

	if (typeof project != "object") {
		throw new Error("Invalid project.skira file.")
	}

	skira.project = merge(this.DEFAULTS, project)
}
