if (typeof _babelPolyfill == "undefined") {
	require("babel-polyfill");
}

var engine = require(process.env.ENGINE);

if (typeof engine == "function") {
	var site = require("site");
	engine(site);
}
