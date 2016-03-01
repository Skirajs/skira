if (typeof _babelPolyfill == "undefined") {
	require("babel-polyfill");
}

var o = require(process.env.ENGINE);

if (typeof o == "function") {
	var site = require("site");
	o = o(site);
}

if (process.env.EXPORT) {
	module.exports = o;
}
