#!/usr/bin/env node
process.env.DEBUG = process.env.DEBUG || "skira:*";

const debug = require("debug")("skira:main");
const fs = require("fs");
const pathTool = require("path");
const Promise = require("bluebird");

const cpr = Promise.promisify(require("cpr"));
const portscanner = Promise.promisifyAll(require("portscanner"));

const ERR_COLOR = "\u001b[31;1m";
const PROJECT_FILE = "project.skira";

Promise.coroutine(function *() {
	var port = process.env.PORT;

	if (process.argv.length >= 3) {
		port = parseInt(process.argv[2]);

		if (isNaN(port)) {
			debug(ERR_COLOR + "Invalid port specified: %s", process.argv[2]);
			process.exit(1);
		}
	}

	try {
		fs.accessSync(PROJECT_FILE, fs.R_OK);
	} catch (err) {
		if (err.code != "ENOENT") {
			debug(ERR_COLOR + "Could not access %s file: %s", PROJECT_FILE, err.message || err);
			process.exit(2);
		}

		var buildSkeleton = true;
	}

	if (buildSkeleton) {
		try {
			debug("Could not find %s file. Building skeleton...", PROJECT_FILE);
			debug("Press Ctrl+C (Cmd+C on Mac) within 5 seconds to cancel...");

			yield Promise.delay(5000);

			debug("Copying sample site to give you a nice kickstart...");

			yield cpr(pathTool.join(__dirname, "../demo"), ".", {
				deleteFirst: false,
				overwrite: false,
				confirm: true
			});

			debug("Done! Continue running startup sequence.");
		} catch (err) {
			debug(ERR_COLOR + "Could not copy skeleton: %s", err.message || err);
			process.exit(2);
		}
	}

	if (!port) {
		debug("Searching for available port...");

		try {
			port = yield portscanner.findAPortNotInUseAsync(8000, 8999, "127.0.0.1");
		} catch (err) {
			debug(ERR_COLOR + "Could not find open port: %s", err.message || err);
			process.exit(2);
		}
	}

	try {
		debug("Loading libraries...");
		const Skira = require("../");

		debug("Starting Skira...");
		new Skira(port);
	} catch (err) {
		debug(ERR_COLOR + "Error while starting Skira: %s", err.message || err);
		process.exit(2);
	}
})();
