const chokidar = (function getChokidar() {
	try {
		return require("chokidar")
	} catch (err) {
		if (err.code == "MODULE_NOT_FOUND") {
			process.exit()
			return
		}

		throw err
	}
})()

let args = process.argv.slice(2)
let opts = {
	ignoreInitial: true,
}

for (let fileOrGlob of args) {
	let watcher = chokidar.watch(fileOrGlob, opts)

	watcher.on("all", () => {
		process.send({ update: fileOrGlob })
	})
}
