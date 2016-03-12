const Promise = require("bluebird")

/**
 * Instantiates a task.
 *
 * @param {object} definition - The task itself, contains functions
 * @param {object} skira - The Skira instance who owns this task
 * @param {string} name - Name used by Skira, mainly for events
 */
function Task(definition, skira, name) {
	this.definition = definition
	this.skira = skira
	this.name = name
}

/**
 * Configure a task after changes to the project config have been made.
 */
Task.prototype.configure = Promise.coroutine(function* configure() {
	var enabledBefore = this.enabled

	yield Promise.resolve(this.definition.configure.call(this))

	if (this.enabled != enabledBefore) {
		yield this[this.enabled ? "init" : "stop"]()
	}
})

/**
 * Initializes a task after it has been enabled by configuration.
 */
Task.prototype.init = Promise.coroutine(function* init() {
	if (typeof this.definition.init == "function") {
		yield Promise.resolve(this.definition.init.call(this))
	}

	yield Promise.resolve(this.run())
})

/**
 * Runs a task if it isn't already running and queues a request if it is running.
 */
Task.prototype.run = Promise.coroutine(function* run() {
	if (this.busy) {
		this.queued = true
		this.skira.emit("queued", this)
		return
	}

	if (!this.enabled) {
		this.skira.emit("norun", this)
		return
	}

	delete this.error

	this.busy = true
	this.lastrun = new Date()

	try {
		this.skira.emit("run", this)

		yield Promise.resolve(this.definition.run.call(this))
		this.lastupdate = new Date()

		this.skira.emit("update", this)
	} catch (err) {
		this.error = err
		this.skira.emit("error", this)
	}

	this.busy = false

	if (this.queued) {
		setImmediate(() => this.run())
	}

	this.queued = false
})

/**
 * Stops a task after it has been disabled.
 */
Task.prototype.stop = Promise.coroutine(function* stop() {
	if (typeof this.definition.stop == "function") {
		yield Promise.resolve(this.definition.stop.call(this))
	}
})

module.exports = Task
