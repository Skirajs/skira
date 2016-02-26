function State(site, page, params) {
	this.site = site;
	this.system = site; // shim for previous incarnation
	this.page = page;
	this.params = params || {};
	this.status = 200;
	this.headers = {};
	this.setLocale(this.site.project.default.locale);
}

State.prototype.setLocale = function(locale) {
	if (typeof locale == "undefined") {
		return;
	}

	if (typeof locale == "number") {
		locale = Object.keys(this.site.locales)[locale];
	}

	this.locale = this.site.locales[locale];
	this.locale.code = locale;
};

module.exports = State;
