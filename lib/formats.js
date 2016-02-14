var jade = require("jade");
var pathTool = require("path");
var yaml = require("js-yaml");

function parseFunctionBody(fn) {
	return fn.slice(fn.indexOf("{") + 1, fn.lastIndexOf("}"));
}

module.exports = {};

module.exports.yaml = {
	extension: "yaml",
	preload: true,
	parser: yaml.safeLoad
};

module.exports.jade = {
	extension: "jade",
	parser: function(file, path) {
		var opts = {};
		opts.filename = pathTool.basename(path);

		var fnStr = jade.compileClient(file, opts);
		var fnParsed = parseFunctionBody(fnStr);

		return new Function("locals", "jade", fnParsed);
	}
};
