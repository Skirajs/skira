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
	data.site = this.site;
	data.system = this.site; // shim for previous incarnation
	data.request = request;
	data.status = 200;
	data.headers = {};

	await this.runEvent("prepare", data);

	var view = this.site.views[data.page.view];

	if (!view) {
		throw new Error("Could not load view: " + data.page.view);
	}

	data.content = view(data, this.site.viewRuntime);

	await this.runEvent("render", data);

	if (data.page.master) {
		var master = this.site.views[data.page.master];
		data.content = master(data, this.site.viewRuntime);
	}

	await this.runEvent("output", data);

	return data;
};

module.exports = Processor;
