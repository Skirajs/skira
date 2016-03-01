const jade = require("jade");
const merge = require("merge");
const pathTool = require("path");
const pathToRegexp = require("path-to-regexp");
const yaml = require("js-yaml");

const PROJECT_DEFAULTS = {
	app: false,
	default: {
		locale: 0
	},
	output: {
		styles: "public/styles.css",
		scripts: "public/scripts.js",
		app: "public/app.js"
	},
	files: {
		path: "public",
		gzip: true,
		index: false,
		cors: true,
		dot: false
	}
};

module.exports.yaml = {
	extension: "yaml",
	parser: function(content, path) {
		return yaml.safeLoad(content);
	}
};

module.exports.skira = {
	extension: "skira",
	parser: function(content, path) {
		var obj = yaml.safeLoad(content);
		return merge.recursive(true, PROJECT_DEFAULTS, obj);
	}
};

module.exports.page = {
	extension: "yaml",
	parser: function(content, path) {
		var page = yaml.safeLoad(content);

		if (page.routes) {
			page._routes = [];

			for (var i in page.routes) {
				var pathStr = page.routes[i];

				try {
					var keys = [];
					var regex = pathToRegexp(pathStr, keys, { end: false });
					regex.keys = keys;
					page._routes[i] = regex;
				} catch (err) {
					throw new Error("Invalid route " + pathStr);
				}
			}
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
