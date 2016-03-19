const State = require("./state")

function Router(site) {
	this.site = site
	this.jumps = {}
}

// call this when your pages are static or every time you mutate it
Router.prototype.mapJumpRoutes = function mapJumpRoutes() {
	this.jumps = {}

	for (var i in this.site.pages) {
		var href = this.site.pages[i].href

		if (href) {
			this.jumps[href] = this.site.pages[i]
		}
	}
}

Router.prototype.resolve = function resolve(path, localePrefix) {
	var jumpRoute = this.jumps[path]

	if (jumpRoute) {
		var state = new State(this.site, jumpRoute)
		state.setLocale(localePrefix)
		return state
	}

	var locale = path.slice(1).split(/\//)[0]

	if (this.site.locales[locale] && !localePrefix) {
		return this.resolve(path.slice(locale.length + 1), locale)
	}

	for (var i in this.site.pages) {
		var page = this.site.pages[i]

		// skip unbound / floating pages
		if (!page.href && !page._routes) {
			continue
		}

		if (path == page.href) {
			return new State(this.site, page, params)
		}

		// nothing left to try here
		if (!page._routes) {
			continue
		}

		for (var j in page._routes) {
			var route = page._routes[j]

			// match the path against the regular expression
			var match = route.regex.exec(path)

			// skip route if there's no match (null)
			if (!match) {
				continue
			}

			// slice out the bit that matters
			var args = match.slice(1)
			var params = {}

			// populate the params
			for (var k in route.keys) {
				params[route.keys[k].name] = args[k]
			}

			// return a new object
			return new State(this.site, page, params)
		}
	}
}

module.exports = Router
