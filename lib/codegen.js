const debug = require("debug")("skira:codegen");
const serialize = require("serialize-javascript");

function buildNav(pages) {
	var nav = {};

	var nameProperty = "SAVE_CPU_CYCLES_" + Math.random();

	for (var pageName in pages) {
		var page = pages[pageName];

		if (!page.navorder) {
			continue;
		}

		for (var navName in page.navorder) {
			if (typeof nav[navName] == "undefined") {
				nav[navName] = [];
			}

			Object.defineProperty(page, nameProperty, {
				value: pageName
			});

			nav[navName].push(page);
		}
	}

	for (var navName in nav) {
		nav[navName].sort(function(pageA, pageB) {
			return pageA.navorder[navName] - pageB.navorder[navName];
		});
	}

	for (var navName in nav) {
		nav[navName] = nav[navName].map(function(page) {
			var name = page[nameProperty];
			delete page[nameProperty];
			return name;
		});
	}

	return nav;
}

function getExtends(site, pageName, buffer) {
	var buffer = buffer || [];
	var page = site.pages[pageName];

	if (!page.extends) {
		return buffer;
	}

	if (buffer.indexOf(page.extends) != -1) {
		debug("Recursion in %s when trying to extend to %s", pageName, page.extends);
		return buffer;
	}

	var newBuffer = buffer.concat(page.extends);
	return getExtends(site, page.extends, newBuffer);
}

function siteCodeGenerator(site) {
	var s = [];

	s.push("var EventEmitter = require('eventemitter3-collector');\n");
	s.push("var jade = require('jade/runtime');\n");
	s.push("var merge = require('merge');\n");
	s.push("Site = new EventEmitter();\n");

	for (var i in site) {
		s.push("Site[" + JSON.stringify(i) + "] = " + serialize(site[i]) + ";\n");
	}

	var nav = buildNav(site.pages);
	s.push("Site.nav = {};\n");

	for (var navName in nav) {
		var txt = nav[navName].map(function(pageName) {
			return "Site.pages[" + JSON.stringify(pageName) + "]";
		});

		s.push("Site.nav[" + JSON.stringify(navName) + "] = [ " + txt.join(", ") + " ];\n");
	}

	for (var page in site.pages) {
		var chain = [].concat(page);

		if (site.pages[page].extends) {
			chain = chain.concat(getExtends(site, page));
		}

		if (chain.length >= 2) {
			chain.reverse();
			s.push("Site.pages[" + JSON.stringify(page) + "] = merge.recursive(true, " + chain.map(p => "Site.pages[" + JSON.stringify(p) + "]").join(", ") + ");\n");
			chain.reverse();
		}

		s.push("Site.pages[" + JSON.stringify(page) + "]._views = [" + chain.filter(p => p.view).map(p => "Site.views[" + JSON.stringify(site.pages[p].view) + "]").join(", ") + "];\n");
	}

	s.push("Site.modules = {};\n");

	if (site.project.modules) {
		for (var i = 0; i < site.project.modules.length; i++) {
			var pkg = site.project.modules[i];
			s.push("Site.modules[" + JSON.stringify(pkg) + "] = require(" + JSON.stringify(pkg) + ")(Site);\n");
		}
	}

	s.push("module.exports = Site;\n");

	return s.join("");
}

module.exports = siteCodeGenerator;
