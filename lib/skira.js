const Promise = require("bluebird")

const debug = require("debug")("skira")
const EventEmitter = require("events").EventEmitter
const findPortAsync = Promise.promisify(require("portscanner").findAPortNotInUse)
const Formats = require("./formats")
const package = require("../package")
const Task = require("./task")
const TreeLoader = require("tree-loader")

/**
 * Main class managing all tasks for live building a Skira site.
 *
 * @param {number} port - Port to use for the proxy. Otherwise randomly chosen.
 */
function Skira(port) {
	this.port = port || findPortAsync(8000, 8999, "127.0.0.1")

	this.createTasks()

	this.projectLoader = new TreeLoader("project.skira", Formats.skira, true)

	this.projectLoader.on("change", () => {
		this.project = this.projectLoader.tree
		this.configureTasks()
	})

	this.on("run", (task) => debug("%s: running", task.name))
	this.on("norun", (task) => debug("%s: tried, but disabled", task.name))
	this.on("update", (task) => debug("%s: updated", task.name))
	this.on("queued", (task) => debug("%s: queued", task.name))
	this.on("error", (task) => debug("%s: %s", task.name, task.error.stack || task.error))
}

/**
 * Inherit an EventEmitter for .emit and .on functionality.
 */
Skira.prototype = Object.create(EventEmitter.prototype)

/**
 * Current Skira version taken from package.json.
 */
Skira.prototype.VERSION = package.version

/**
 * Global definition of Skira tasks.
 */
Skira.prototype.taskDefinitions = {
	styles: require("../tasks/styles"),
	scripts: require("../tasks/scripts"),
	codegen: require("../tasks/codegen"),
	server: require("../tasks/server"),
	proxy: require("../tasks/proxy"),
}

/**
 * Creates all tasks in waiting for configuration state.
 */
Skira.prototype.createTasks = function createTasks() {
	this.tasks = {}

	// get every task's name
	Object.keys(this.taskDefinitions)
		// map name and definition
		.map(name => ({ name, def: this.taskDefinitions[name] }))
		// create a task based on every definition
		.forEach(opt => this.tasks[opt.name] = new Task(opt.def, this, opt.name))
}

/**
 * Tells all tasks to check their configs when the project config changes.
 */
Skira.prototype.configureTasks = function configure() {
	// get every task's name
	Object.keys(this.tasks)
		// map the name to its value
		.map(name => this.tasks[name])
		// make sure they're all tasks
		.filter(task => task && typeof task.configure == "function")
		// configure every task
		.forEach(t => t.configure())
}

// expose our class
module.exports = Skira
