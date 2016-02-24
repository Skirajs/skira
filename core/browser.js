var diff = require("diffhtml");
var Router = require("./router");
var Processor = require("./processor");
var urlTool = require("url");

var APP_MODE = false;

function loadPage(pathname) {
	var page = router.resolve(pathname);

	if (!page) {
		console.log("No route");
		// TODO: ajax
		return;
	}

	var output = processor.render(page);

	scrollTo(0, 0);

	if (document.activeElement) {
		document.activeElement.blur();
	}

	diff.outerHTML(document.documentElement, output.content);

	for (var i = 0; i < document.links.length; i++) {
		var link = document.links[i];

		// TODO: check if not absolute url

		var target = urlTool.parse(link.href);

		// check if not already patched
		if (target.hash && target.hash.slice(0, 2) == "#!") {
			return;
		}

		if (target.protocol != location.protocol) {
			return;
		}

		if (target.hostname != location.hostname) {
			return;
		}

		if (target.port != location.port) {
			return;
		}

		link.href = "#!" + target.path;
	}
}

module.exports = function(site) {
	var router = new Router(site);
	var processor = new Processor(site);

	window.addEventListener("hashchange", function() {
		var path = window.location.hash.slice(2);

		if (APP_MODE) {
			loadPage(path);
		} else {
			history.replaceState({}, "", path);
		}
	});

	window.addEventListener("popstate", function(e) {
		if (APP_MODE) {
			return;
		}

		setTimeout(function() {
			loadPage(location.path);
		});
	});

	loadPage("/");
}
