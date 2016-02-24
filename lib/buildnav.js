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
			return name;
		});
	}

	return nav;
}

module.exports = buildNav;
