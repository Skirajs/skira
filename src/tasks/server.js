const fork = require("child_process").fork
const pathTool = require("path")

function ServerTask() {
}

module.exports = ServerTask

ServerTask.prototype.triggers = {
	after: !process.env.BUILD && "site",
	restart: true,
}

ServerTask.prototype.filter = function filter(project) {
	return project.server !== false
}

ServerTask.prototype.prepare = function prepare() {
	let moduleDir = pathTool.dirname(require.resolve("skira-server/package"))
	let localPath = require("skira-server/package").bin["skira-server"]

	this.serverPath = moduleDir + "/" + localPath
	this.spare = this.startServer(this)
}

ServerTask.prototype.execute = async function execute() {
	let main = this.spare && !this.spare.dead ? this.spare : this.startServer(this)
	this.spare = this.startServer(this)

	main.send({ start: true })

	let exitCode = await new Promise((resolve) => {
		main.on("exit", resolve)
	})

	if (exitCode) {
		throw new Error("Process exited with error code " + exitCode)
	}
}

ServerTask.prototype.startServer = function startServer() {
	let proc = fork(this.serverPath, ["0", "127.0.0.1"], {
		cwd: process.cwd(),
		env: { DEBUG: "1" },
	})

	proc.on("exit", () => proc.dead = true)

	proc.on("message", (m) => {
		if (m.address) {
			this.address = m.address
		}

		if (m.error) {
			this.error.push(m.error)
		}
	})

	return proc
}
