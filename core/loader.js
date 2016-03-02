if (typeof _babelPolyfill == "undefined") {
	require("babel-polyfill");
}

const applySite = require("site");
const EventEmitter = require("eventemitter3-collector");
const jade = require("jade/runtime");
const merge = require("merge");

function genSite() {
	var site = applySite(jade, new EventEmitter());

	

	return site;
}

module.exports = (function() {
	var engine = require(process.env.ENGINE);

	if (engine) {
		return genSite();
	}

	if (typeof engine == "function") {
		return engine(genSite());
	}

	return engine;
})();
