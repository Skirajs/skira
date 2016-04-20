const chokidar = require("chokidar")

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
