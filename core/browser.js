const diff = require("diffhtml")
const Router = require("./router")
const Processor = require("./processor")
const urlTool = require("url")

module.exports = function setupSkira(site) {
	var APP_MODE = site.project.app === true

	var router = new Router(site)
	var processor = new Processor(site)

	function patchLinks() {
		for (var i = 0; i < document.links.length; i++) {
			var link = document.links[i]

			// TODO: check if not absolute url OR has no href

			var target = urlTool.parse(link.href)

			// check if not already patched
			if (target.hash && target.hash.slice(0, 2) == "#!") {
				return
			}

			if (target.protocol != location.protocol) {
				return
			}

			if (target.hostname != location.hostname) {
				return
			}

			if (target.port != location.port) {
				return
			}

			link.href = "#!" + target.path
		}
	}

	async function loadPage(pathname) {
		var page = router.resolve(pathname)

		if (!page) {
			console.log("No route")
			// TODO: ajax
			return
		}

		page.request = { url: pathname }

		var output = await processor.render(page)

		scrollTo(0, 0)

		if (document.activeElement) {
			document.activeElement.blur()
		}

		// TODO: keep track of js files we load and avoid duplicates
		// TODO: fire load event / DOMContentReady?

		diff.outerHTML(document.documentElement, output.content)

		patchLinks()
	}

	window.addEventListener("hashchange", () => {
		var path = window.location.hash.slice(2)

		if (APP_MODE) {
			loadPage(path)
		} else {
			history.replaceState({}, "", path)
		}
	})

	window.addEventListener("popstate", (e) => {
		if (APP_MODE) {
			return
		}

		setTimeout(() => {
			loadPage(location.pathname + location.search)
		}, 0)
	})

	if (APP_MODE) {
		var path = window.location.hash.slice(2) || "/"
		loadPage(path)
	} else {
		patchLinks()
	}

	// TODO: bind this to a proper event
	setInterval(() => {
		var liElements = document.getElementsByTagName("body")

		for (var i = 1; i < liElements.length; i++) {
			liElements[i].parentNode.removeChild(liElements[i])
		}
	}, 800)

	if (APP_MODE) {
		// TODO: event of some sort, so we can implement a loading screen
		// TODO: or enable a login button
		console.log("App done loading")
	} else {
		console.log("Site accelerator online")
	}
}
