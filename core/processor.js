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

Processor.prototype.render = async function(data) {
	await this.runEvent("prepare", data);
	await this.runEvent("render", data);

	for (var view of data.page._views) {
		data.content = view(data);
	}

	await this.runEvent("output", data);

	return data;
};

module.exports = Processor;
