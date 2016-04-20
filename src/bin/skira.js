#!/usr/bin/env node
let port = process.env.PORT

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

async function newAsync(fn, ...args) {
	let base = Object.create(fn.prototype || fn)
	let out = await Promise.resolve(fn.apply(base, args)) || base

	return out
}

;(async function IIFE() {
	try {
		console.error("Loading libraries...")
		const Skira = require("../../")

		console.error("Starting Skira...")
		await newAsync(Skira, port)
	} catch (err) {
		console.error("Error while starting Skira:", err.stack || err)
		process.exit(2)
	}
})()
