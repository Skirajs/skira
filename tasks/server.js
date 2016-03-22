const Promise = require("bluebird")

const chokidar = require("chokidar")
const fork = require("child_process").fork
const fs = require("fs")
const moment = require("moment")

/**
 * Forks the debug worker and broadcasts the address when it comes online.
 *
 * @return {ChildProcess}
 */
function setupWorker() {
	var worker = fork(require.resolve("../lib/debugworker"), [
		this.input,
	], {
		silent: true,
	})

	worker.on("error", (err) => {
		this.error.push(err)
		this.busy = false
	})

	worker.on("exit", (code, signal) => {
		if (!worker.killed) {
			var msg = `Server process exited with exit code ${code}`

			if (signal) {
				msg += ` (${signal})`
			}

			this.error.push(new Error(msg))
		}

		this.busy = false
		delete this.address
	})

	handleMessages("log", worker.stdout)
	handleMessages("error", worker.stderr)

	worker.on("message", (m) => {
		if (m.address) {
			this.address = m.address
		}

		if (m.error) {
			this.error.push(m.error)
		}
	})

	return worker
}

/**
 * Binds to data events and pretty prints separate lines with datetimes prefixed.
 *
 * @param {string} name - Human friendly name of this stream
 * @param {stream.Readable} std - Stream with console output
 */
function handleMessages(name, std) {
	std.setEncoding("utf8")

	var fixedPrefix = `[server:${name}] `

	std.on("data", (data) => {
		var time = moment().format()
		var localPrefix = `${time}: `

		var lines = data.trim().split(/\r\n|\r|\n/g)

		lines.forEach((line, offset) => {
			var p = offset == 0 ? localPrefix : " ".repeat(localPrefix.length)
			console.log(fixedPrefix + p + line)
		})
	})
}

/**
 * Sets input file path. Currently hardcoded.
 */
exports.configure = function configure() {
	this.enabled = true
	this.input = this.skira.project.builds.site
}

/**
 * Sets up our first (spare) worker.
 */
exports.init = function init() {
	this.spare = setupWorker.call(this)
	this.enabled = false

	this.updateHook = (task) => {
		if (task == this.skira.tasks.codegen) {
			this.enabled = true
			this.run()
		}
	}

	this.skira.on("update", this.updateHook)

	this.watcher = chokidar.watch("node_modules", {
		ignoreInitial: true,
	})

	this.watcher.on("all", (event, path) => {
		this.enabled = true
		this.run()
	})
}

/**
 * Reads the exported site into the worker and waits for it to be done reading.
 * It uses the spare worker for faster boot times and sets up a new spare.
 */
exports.run = Promise.coroutine(function* run() {
	if (this.main && this.main.pid) {
		this.main.killed = true
		this.main.kill()
	}

	delete this.address
	this.main = this.spare
	this.spare = setupWorker.call(this)

	this.main.send({ start: true })

	yield new Promise((resolve, reject) => {
		this.main.once("message", (m) => {
			if (m.address) {
				resolve()
			}
		})
	}).timeout(10e3).catch(Promise.TimeoutError, (e) => {
		throw new Error("Server did not pass address within 10 seconds")
	})
})

/**
 * Shuts down both the main and spare worker.
 */
exports.stop = function stop() {
	if (this.updateHook) {
		this.skira.removeListener("update", this.updateHook)
		delete this.updateHook
	}

	if (this.spare) {
		this.spare.kill()
		delete this.spare
	}

	if (this.main) {
		this.main.kill()
		delete this.main
	}

	if (this.watcher) {
		this.watcher.close()
		delete this.watcher
	}
}
