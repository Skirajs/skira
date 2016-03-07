const LessBuilder = require("less-builder");

const debug = function() {
	process.send({ debug: Array.prototype.slice.call(arguments) });
};

var lessbuilder;

function setup(config) {
	if (lessbuilder) {
		lessbuilder.stop();
		delete lessbuilder;
	}

	debug("Setting up LESS builder...");

	this.lessbuilder = new LessBuilder("styles/index.less", config.out, "debug/styles.map");

	this.lessbuilder.on("start", () => {
		debug("Compiling LESS files...");
	});

	this.lessbuilder.on("error", (err) => {
		debug("Error in LESS files: %s", err.message || err);
	});

	this.lessbuilder.on("end", () => {
		debug("Done compiling LESS files.");
	});

	this.lessbuilder.startBuild();
}

process.on("message", (m) => {
	if (m.config) {
		setup(m.config);
	}
});
