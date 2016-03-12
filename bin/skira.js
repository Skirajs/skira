#!/usr/bin/env node
var port = process.env.PORT

if (process.argv.length >= 3) {
	port = parseInt(process.argv[2])

	if (isNaN(port)) {
		console.error("Invalid port specified: %s", process.argv[2])
		process.exit(1)
	}
}

process.on("uncaughtException", (err) => {
	console.log("Uncaught exception:", err.stack || err)
})

try {
	console.error("Loading libraries...")
	const Skira = require("../")

	console.error("Starting Skira...")
	new Skira(port)
} catch (err) {
	console.error("Error while starting Skira:", err.stack || err)
	process.exit(2)
}
