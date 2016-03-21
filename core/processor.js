const Promise = require("bluebird")

function Processor(site) {
	this.site = site
}

Processor.prototype.runEvent = function runEvent(eventName, data) {
	var output = data.site.collect(eventName, data)

	if (Array.isArray(output)) {
		return Promise.all(output)
	}

	return Promise.resolve(output)
}

Processor.prototype.render = Promise.coroutine(function* render(data) {
	yield this.runEvent("prepare", data)

	yield this.runEvent("render", data)

	for (var view of data.page._views) {
		data.content = view(data)
	}

	yield this.runEvent("output", data)

	return data
})

module.exports = Processor
