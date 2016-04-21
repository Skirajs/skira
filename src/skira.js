const bulk = require("bulk-require")
const debug = require("debug")("skira")
const fork = require("child_process").fork
const portfinder = require("portfinder")

async function Skira(port) {
	this.port = port || await new Promise((resolve, reject) => {
		portfinder.getPort((err, port) => {
			err && reject(err) || resolve(port)
		})
	})
	debug("Chosen %d as proxy port.", this.port)

	await this.createTasks()
	this.mapTriggers()
	this.mapWatchers()
	await this.autoStart()
	this.deployWatcher()
}

Skira.prototype.BASE_TASKS = bulk(__dirname + "/tasks", "*.js")

Skira.prototype.createTasks = async function createTasks() {
	this.tasks = {}
	let jobs = []

	for (let taskName in this.BASE_TASKS) {
		jobs.push((async () => {
			let taskObject = this.BASE_TASKS[taskName]
			let base = Object.create(taskObject.prototype || taskObject)

			if (typeof taskObject == "function") {
				let out = await Promise.resolve(taskObject.call(base, this))
				base = out || base
			}

			this.tasks[taskName] = base
		})())
	}

	await Promise.all(jobs)
}

Skira.prototype.mapTriggers = function mapTriggers() {
	this.triggers = {}

	for (let taskName in this.tasks) {
		let task = this.tasks[taskName]

		// triggerWord can be "after", "with", etc.
		for (let triggerWord in task.triggers || {}) {
			// If not an object yet, create it.
			if (!this.triggers[triggerWord]) {
				this.triggers[triggerWord] = {}
			}

			let wordBasedTriggers = this.triggers[triggerWord]

			// This array contains all task names which will trigger this task.
			let targetTasks = [].concat(task.triggers[triggerWord])

			for (let targetTaskName of targetTasks) {
				if (!wordBasedTriggers[targetTaskName]) {
					wordBasedTriggers[targetTaskName] = []
				}

				wordBasedTriggers[targetTaskName].push(taskName)
			}
		}
	}
}

Skira.prototype.mapWatchers = function mapWatchers() {
	this.watchers = {}

	for (let taskName in this.tasks) {
		let task = this.tasks[taskName]

		if (task.triggers && task.triggers.watch) {
			let patterns = [].concat(task.triggers.watch)
			this.watchers[taskName] = patterns
		}
	}
}

Skira.prototype.execTask = async function execTask(taskName) {
	debug("Attempt to run task %s.", taskName)
	let task = this.tasks[taskName]

	if (!task) {
		throw new Error("No such task: " + taskName)
	}

	try {
		if (typeof task.filter == "function" && !task.filter(this)) {
			debug("Task %s was filtered.", taskName)

			if (task.prepared && typeof task.cleanup == "function") {
				debug("Cleaning up %s.", taskName)
				task.cleanup()
			}

			return false
		}
	} catch (err) {
		task.error = [].concat(task.error || []).concat(err)
		debug("Error while checking filter of %s:\n", taskName, err.stack || err)
	}

	if (task.busy) {
		debug("Task %s is already executing. Queueing up.", taskName)
		return new Promise((...args) => task.queue.push(args))
	}

	try {
		if (!task.prepared && typeof task.prepare == "function") {
			debug("Preparing task %s.", taskName)
			await Promise.resolve(task.prepare(this))
			task.prepared = true
		}
	} catch (err) {
		task.error = [].concat(task.error || []).concat(err)
		debug("Error while preparing %s:\n", taskName, err.stack || err)
	}

	task.busy = true
	task.error = []
	task.queue = []
	task.lastexec = new Date()

	try {
		debug("Executing task %s.", taskName)
		await Promise.resolve(task.execute(this))
		task.lastupdate = new Date()
		debug("Successfully executed task %s.", taskName)

		let triggeredAfter = this.triggers.after[taskName] || []
		let names = triggeredAfter.join(", ") || "none"
		debug("Executing tasks triggered by %s: %s", taskName, names)
		this.multiStart(triggeredAfter)
	} catch (err) {
		task.error.push(err)
		debug("Error while executing %s:\n", taskName, err.stack || err)
	}

	task.busy = false

	if (task.queue && task.queue.length) {
		debug("Executing for the queue (%d) for %s.", task.queue.length, taskName)
		let callbacks = task.queue

		setImmediate(async () => {
			try {
				await this.execTask(taskName)

				debug("Successfully executed queue task %s.", taskName)
				callbacks.forEach((args) => setImmediate(args[0]))
			} catch (err) {
				debug("Error while executing queue task %s.", taskName)
				callbacks.forEach((args) => setImmediate(() => args[1](err)))
			}
		})
	}

	if (this.triggers.restart && this.triggers.restart.true.indexOf(taskName) != -1) {
		await new Promise((resolve) => setTimeout(resolve, 100))
		return this.execTask(taskName)
	}

	return true
}

Skira.prototype.multiStart = function multiStart(taskNameArray) {
	for (let targetTaskName of taskNameArray || []) {
		setImmediate(() => this.execTask(targetTaskName))
	}
}

Skira.prototype.autoStart = async function startAuto() {
	let toStart = []

	if (this.triggers.auto) {
		for (let taskName of this.triggers.auto.true || {}) {
			toStart.push(this.execTask(taskName))
		}
	}

	await Promise.all(toStart)
}

Skira.prototype.deployWatcher = function deployWatcher() {
	let args = Object.keys(this.triggers.watch)
	let watcher

	const watchProc = async (args) => {
		watcher = fork(require.resolve("./watch"), args)

		watcher.on("message", (m) => {
			if (m.update) {
				this.multiStart(this.triggers.watch[m.update])
			}
		})

		await new Promise((resolve, reject) => {
			watcher.on("exit", (errorCode) => {
				if (errorCode) {
					reject(new Error("Exited with error code " + errorCode))
				} else {
					resolve()
				}
			})
		})
	}

	setImmediate(async () => {
		let encounteredError = false

		while (!encounteredError) {
			try {
				await watchProc(args)
			} catch (err) {
				encounteredError = true
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
		}
	})

	return function killWatcher() {
		watcher.kill()
	}
}

module.exports = Skira
