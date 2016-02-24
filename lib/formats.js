const jade = require("jade");
const pathTool = require("path");
const pathToRegexp = require("path-to-regexp");
const yaml = require("js-yaml");

module.exports.yaml = {
	extension: "yaml",
	parser: function(content, path) {
		return yaml.safeLoad(content);
	}
};

module.exports.skira = {
	extension: "skira",
	parser: function(content, path) {
		return yaml.safeLoad(content);
	}
};

module.exports.page = {
	extension: "yaml",
	parser: function(content, path) {
		var page = yaml.safeLoad(content);

		if (page.routes) {
			page._routes = page.routes.map(function(pathStr) {
				var keys = [];
				var regex = pathToRegexp(pathStr, keys);
				regex.keys = keys;
				return regex;
			});
		}

		return page;
	}
};

module.exports.jade = {
	extension: "jade",
	parser: function(file, path) {
		var opts = {};
		opts.filename = pathTool.basename(path);

		var fnStr = jade.compileClient(file, opts);

		return new Function("return " + fnStr)();
	}
};
