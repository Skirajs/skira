const Promise = require("bluebird");

function Processor(site) {
	this.site = site;
}

Processor.prototype.runEvent = function(eventName, data) {
	var output = data.site.emit(eventName, data);

	if (Array.isArray(output)) {
		return Promise.all(output);
	}

	return output;
};

Processor.prototype.render = async function(data, request) {
	await this.runEvent("prepare", data);

	var view = this.site.views[data.page.view];

	if (!view) {
		throw new Error("Could not load view: " + data.page.view);
	}

	data.content = view(data);

	await this.runEvent("render", data);

	if (data.page.master) {
		var master = this.site.views[data.page.master];
		data.content = master(data);
	}

	await this.runEvent("output", data);

	return data;
};

module.exports = Processor;
