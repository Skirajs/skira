const serialize = require("serialize-javascript");
const stream = require("stream");

function siteCodeGenerator(site) {
	var s = [];

	s.push("module.exports = function(jade, Site) {\n");
	s.push("Site = Site || {};\n");

	for (var i in site) {
		if (i == "nav") {
			continue;
		}

		s.push("Site[" + JSON.stringify(i) + "] = " + serialize(site[i]) + ";\n");
	}

	s.push("Site.nav = {};\n");

	for (var navName in site.nav) {
		var txt = site.nav[navName].map(function(pageName) {
			return "Site.pages[" + JSON.stringify(pageName) + "]";
		});

		s.push("Site.nav[" + JSON.stringify(navName) + "] = [ " + txt.join(", ") + " ];\n");
	}

	s.push("Site.modules = {};\n");

	if (site.project.modules) {
		for (var i = 0; i < site.project.modules.length; i++) {
			var pkg = site.project.modules[i];
			s.push("Site.modules[" + JSON.stringify(pkg) + "] = require(" + JSON.stringify(pkg) + ")(Site);\n");
		}
	}

	s.push("return Site;\n");
	s.push("};\n");

	return s.join("");
}

module.exports = siteCodeGenerator;
