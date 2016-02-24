function RouteObject(page, params) {
	this.page = page;
	this.params = params || {};
}

function Router(site) {
	this.site = site;
	this.jumps = {};
}

// call this when your pages are static or every time you mutate it
Router.prototype.mapJumpRoutes = function() {
	this.jumps = {};

	for (var i in this.site.pages) {
		var href = this.site.pages[i].href;

		if (href) {
			this.jumps[href] = this.site.pages[i];
		}
	}
};

Router.prototype.resolve = function(path) {
	var jumpRoute = this.jumps[path];

	if (jumpRoute) {
		return new RouteObject(jumpRoute);
	}

	for (var i in this.site.pages) {
		var page = this.site.pages[i];

		// skip unbound / floating pages
		if (!page.href && !page.routes) {
			continue;
		}

		if (path == page.href) {
			return new RouteObject(page, params);
		}

		// nothing left to try here
		if (!page._routes) {
			continue;
		}

		for (var j in page._routes) {
			var route = page._routes[j];

			// match the path against the regular expression
			var match = route.exec(path);

			// skip route if there's no match (null)
			if (!match) {
				continue;
			}

			// slice out the bit that matters
			var args = match.slice(1);
			var params = {};

			// populate the params
			for (var k in route.keys) {
				params[route.keys[k].name] = args[k];
			}

			// return a new object
			return new RouteObject(page, params);
		}
	}
};

module.exports = Router;
