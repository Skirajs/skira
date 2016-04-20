"use strict";

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _setImmediate2 = require("babel-runtime/core-js/set-immediate");

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

var _getIterator2 = require("babel-runtime/core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _create = require("babel-runtime/core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var Skira = function () {
	var ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(port) {
		return _regenerator2.default.wrap(function _callee$(_context) {
			while (1) {
				switch (_context.prev = _context.next) {
					case 0:
						_context.t0 = port;

						if (_context.t0) {
							_context.next = 5;
							break;
						}

						_context.next = 4;
						return new _promise2.default(function (resolve, reject) {
							portfinder.getPort(function (err, port) {
								err && reject(err) || resolve(port);
							});
						});

					case 4:
						_context.t0 = _context.sent;

					case 5:
						this.port = _context.t0;

						debug("Chosen %d as proxy port.", this.port);

						_context.next = 9;
						return this.createTasks();

					case 9:
						this.mapTriggers();
						this.mapWatchers();
						_context.next = 13;
						return this.autoStart();

					case 13:
						this.deployWatcher();

					case 14:
					case "end":
						return _context.stop();
				}
			}
		}, _callee, this);
	}));
	return function Skira(_x) {
		return ref.apply(this, arguments);
	};
}();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bulk = require("bulk-require");
var debug = require("debug")("skira");
var fork = require("child_process").fork;
var portfinder = require("portfinder");

Skira.prototype.BASE_TASKS = bulk(__dirname + "/tasks", "*.js");

Skira.prototype.createTasks = function () {
	var ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
		var _this = this;

		var jobs, _loop, taskName;

		return _regenerator2.default.wrap(function _callee3$(_context3) {
			while (1) {
				switch (_context3.prev = _context3.next) {
					case 0:
						this.tasks = {};
						jobs = [];

						_loop = function _loop(taskName) {
							jobs.push((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
								var taskObject, base, out;
								return _regenerator2.default.wrap(function _callee2$(_context2) {
									while (1) {
										switch (_context2.prev = _context2.next) {
											case 0:
												taskObject = _this.BASE_TASKS[taskName];
												base = (0, _create2.default)(taskObject.prototype || taskObject);

												if (!(typeof taskObject == "function")) {
													_context2.next = 7;
													break;
												}

												_context2.next = 5;
												return _promise2.default.resolve(taskObject.call(base, _this));

											case 5:
												out = _context2.sent;

												base = out || base;

											case 7:

												_this.tasks[taskName] = base;

											case 8:
											case "end":
												return _context2.stop();
										}
									}
								}, _callee2, _this);
							}))());
						};

						for (taskName in this.BASE_TASKS) {
							_loop(taskName);
						}

						_context3.next = 6;
						return _promise2.default.all(jobs);

					case 6:
					case "end":
						return _context3.stop();
				}
			}
		}, _callee3, this);
	}));

	function createTasks() {
		return ref.apply(this, arguments);
	}

	return createTasks;
}();

Skira.prototype.mapTriggers = function mapTriggers() {
	this.triggers = {};

	for (var taskName in this.tasks) {
		var task = this.tasks[taskName];

		// triggerWord can be "after", "with", etc.
		for (var triggerWord in task.triggers || {}) {
			// If not an object yet, create it.
			if (!this.triggers[triggerWord]) {
				this.triggers[triggerWord] = {};
			}

			var wordBasedTriggers = this.triggers[triggerWord];

			// This array contains all task names which will trigger this task.
			var targetTasks = [].concat(task.triggers[triggerWord]);

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = (0, _getIterator3.default)(targetTasks), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var targetTaskName = _step.value;

					if (!wordBasedTriggers[targetTaskName]) {
						wordBasedTriggers[targetTaskName] = [];
					}

					wordBasedTriggers[targetTaskName].push(taskName);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}
		}
	}
};

Skira.prototype.mapWatchers = function mapWatchers() {
	this.watchers = {};

	for (var taskName in this.tasks) {
		var task = this.tasks[taskName];

		if (task.triggers && task.triggers.watch) {
			var patterns = [].concat(task.triggers.watch);
			this.watchers[taskName] = patterns;
		}
	}
};

Skira.prototype.execTask = function () {
	var ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(taskName) {
		var _this2 = this;

		var task, triggeredAfter, names;
		return _regenerator2.default.wrap(function _callee5$(_context5) {
			while (1) {
				switch (_context5.prev = _context5.next) {
					case 0:
						debug("Attempt to run task %s.", taskName);
						task = this.tasks[taskName];

						if (task) {
							_context5.next = 4;
							break;
						}

						throw new Error("No such task: " + taskName);

					case 4:
						_context5.prev = 4;

						if (!(typeof task.filter == "function" && !task.filter(this))) {
							_context5.next = 9;
							break;
						}

						debug("Task %s was filtered.", taskName);

						if (task.prepared && typeof task.cleanup == "function") {
							debug("Cleaning up %s.", taskName);
							task.cleanup();
						}

						return _context5.abrupt("return", false);

					case 9:
						_context5.next = 15;
						break;

					case 11:
						_context5.prev = 11;
						_context5.t0 = _context5["catch"](4);

						task.error = [].concat(task.error || []).concat(_context5.t0);
						debug("Error while checking filter of %s:\n", taskName, _context5.t0.stack || _context5.t0);

					case 15:
						if (!task.busy) {
							_context5.next = 18;
							break;
						}

						debug("Task %s is already executing. Queueing up.", taskName);
						return _context5.abrupt("return", new _promise2.default(function () {
							for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
								args[_key] = arguments[_key];
							}

							return task.queue.push(args);
						}));

					case 18:
						_context5.prev = 18;

						if (!(!task.prepared && typeof task.prepare == "function")) {
							_context5.next = 24;
							break;
						}

						debug("Preparing task %s.", taskName);
						_context5.next = 23;
						return _promise2.default.resolve(task.prepare(this));

					case 23:
						task.prepared = true;

					case 24:
						_context5.next = 30;
						break;

					case 26:
						_context5.prev = 26;
						_context5.t1 = _context5["catch"](18);

						task.error = [].concat(task.error || []).concat(_context5.t1);
						debug("Error while preparing %s:\n", taskName, _context5.t1.stack || _context5.t1);

					case 30:

						task.busy = true;
						task.error = [];
						task.queue = [];
						task.lastexec = new Date();

						_context5.prev = 34;

						debug("Executing task %s.", taskName);
						_context5.next = 38;
						return _promise2.default.resolve(task.execute(this));

					case 38:
						task.lastupdate = new Date();
						debug("Successfully executed task %s.", taskName);

						triggeredAfter = this.triggers.after[taskName] || [];
						names = triggeredAfter.join(", ") || "none";

						debug("Executing tasks triggered by %s: %s", taskName, names);
						this.multiStart(triggeredAfter);
						_context5.next = 50;
						break;

					case 46:
						_context5.prev = 46;
						_context5.t2 = _context5["catch"](34);

						task.error.push(_context5.t2);
						debug("Error while executing %s:\n", taskName, _context5.t2.stack || _context5.t2);

					case 50:

						task.busy = false;

						if (task.queue && task.queue.length) {
							(function () {
								debug("Executing for the queue (%d) for %s.", task.queue.length, taskName);
								var callbacks = task.queue;

								(0, _setImmediate3.default)((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
									return _regenerator2.default.wrap(function _callee4$(_context4) {
										while (1) {
											switch (_context4.prev = _context4.next) {
												case 0:
													_context4.prev = 0;
													_context4.next = 3;
													return _this2.execTask(taskName);

												case 3:

													debug("Successfully executed queue task %s.", taskName);
													callbacks.forEach(function (args) {
														return (0, _setImmediate3.default)(args[0]);
													});
													_context4.next = 11;
													break;

												case 7:
													_context4.prev = 7;
													_context4.t0 = _context4["catch"](0);

													debug("Error while executing queue task %s.", taskName);
													callbacks.forEach(function (args) {
														return (0, _setImmediate3.default)(function () {
															return args[1](_context4.t0);
														});
													});

												case 11:
												case "end":
													return _context4.stop();
											}
										}
									}, _callee4, _this2, [[0, 7]]);
								})));
							})();
						}

						if (!(this.triggers.restart && this.triggers.restart.true.indexOf(taskName) != -1)) {
							_context5.next = 56;
							break;
						}

						_context5.next = 55;
						return new _promise2.default(function (resolve) {
							return setTimeout(resolve, 100);
						});

					case 55:
						return _context5.abrupt("return", this.execTask(taskName));

					case 56:
						return _context5.abrupt("return", true);

					case 57:
					case "end":
						return _context5.stop();
				}
			}
		}, _callee5, this, [[4, 11], [18, 26], [34, 46]]);
	}));

	function execTask(_x2) {
		return ref.apply(this, arguments);
	}

	return execTask;
}();

Skira.prototype.multiStart = function multiStart(taskNameArray) {
	var _this3 = this;

	var _iteratorNormalCompletion2 = true;
	var _didIteratorError2 = false;
	var _iteratorError2 = undefined;

	try {
		var _loop2 = function _loop2() {
			var targetTaskName = _step2.value;

			(0, _setImmediate3.default)(function () {
				return _this3.execTask(targetTaskName);
			});
		};

		for (var _iterator2 = (0, _getIterator3.default)(taskNameArray || []), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
			_loop2();
		}
	} catch (err) {
		_didIteratorError2 = true;
		_iteratorError2 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion2 && _iterator2.return) {
				_iterator2.return();
			}
		} finally {
			if (_didIteratorError2) {
				throw _iteratorError2;
			}
		}
	}
};

Skira.prototype.autoStart = function () {
	var ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
		var toStart, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, taskName;

		return _regenerator2.default.wrap(function _callee6$(_context6) {
			while (1) {
				switch (_context6.prev = _context6.next) {
					case 0:
						toStart = [];

						if (!this.triggers.auto) {
							_context6.next = 21;
							break;
						}

						_iteratorNormalCompletion3 = true;
						_didIteratorError3 = false;
						_iteratorError3 = undefined;
						_context6.prev = 5;

						for (_iterator3 = (0, _getIterator3.default)(this.triggers.auto.true || {}); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
							taskName = _step3.value;

							toStart.push(this.execTask(taskName));
						}
						_context6.next = 13;
						break;

					case 9:
						_context6.prev = 9;
						_context6.t0 = _context6["catch"](5);
						_didIteratorError3 = true;
						_iteratorError3 = _context6.t0;

					case 13:
						_context6.prev = 13;
						_context6.prev = 14;

						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}

					case 16:
						_context6.prev = 16;

						if (!_didIteratorError3) {
							_context6.next = 19;
							break;
						}

						throw _iteratorError3;

					case 19:
						return _context6.finish(16);

					case 20:
						return _context6.finish(13);

					case 21:
						_context6.next = 23;
						return _promise2.default.all(toStart);

					case 23:
					case "end":
						return _context6.stop();
				}
			}
		}, _callee6, this, [[5, 9, 13, 21], [14,, 16, 20]]);
	}));

	function startAuto() {
		return ref.apply(this, arguments);
	}

	return startAuto;
}();

Skira.prototype.deployWatcher = function deployWatcher() {
	var _this4 = this;

	var args = (0, _keys2.default)(this.triggers.watch);

	var watchProc = function () {
		var ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(args) {
			var watcher;
			return _regenerator2.default.wrap(function _callee7$(_context7) {
				while (1) {
					switch (_context7.prev = _context7.next) {
						case 0:
							watcher = fork(require.resolve("./watch"), args);


							watcher.on("message", function (m) {
								if (m.update) {
									_this4.multiStart(_this4.triggers.watch[m.update]);
								}
							});

							_context7.next = 4;
							return new _promise2.default(function (resolve, reject) {
								watcher.on("exit", function (errorCode) {
									if (errorCode) {
										reject(new Error("Exited with error code " + errorCode));
									} else {
										resolve();
									}
								});
							});

						case 4:
						case "end":
							return _context7.stop();
					}
				}
			}, _callee7, _this4);
		}));
		return function watchProc(_x3) {
			return ref.apply(this, arguments);
		};
	}();

	(0, _setImmediate3.default)((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
		return _regenerator2.default.wrap(function _callee8$(_context8) {
			while (1) {
				switch (_context8.prev = _context8.next) {
					case 0:
						if (!true) {
							_context8.next = 13;
							break;
						}

						_context8.prev = 1;
						_context8.next = 4;
						return watchProc(args);

					case 4:
						return _context8.abrupt("break", 13);

					case 7:
						_context8.prev = 7;
						_context8.t0 = _context8["catch"](1);
						_context8.next = 11;
						return new _promise2.default(function (resolve) {
							return setTimeout(resolve, 100);
						});

					case 11:
						_context8.next = 0;
						break;

					case 13:
					case "end":
						return _context8.stop();
				}
			}
		}, _callee8, _this4, [[1, 7]]);
	})));

	return function killWatcher() {
		watcher.kill();
	};
};

module.exports = Skira;
//# sourceMappingURL=data:application/json;base64,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QkFBWjs7O0lBQU4sQ0FId0Q7O0FBdUJ4RCx3RkFBYTs7Ozs7V0FDTDs7Ozs7OzthQUVDLFVBQVUsSUFBVjs7Ozs7Ozs7O2FBR0Esc0JBQVk7Y0FBVyxXQUFXLE9BQVgsRUFBb0IsR0FBcEI7T0FBWDs7Ozs7Ozs7Ozs7O0VBTlIsRUFBYixFQXZCd0Q7O0FBa0N4RCxRQUFPLFNBQVMsV0FBVCxHQUF1QjtBQUM3QixVQUFRLElBQVIsR0FENkI7RUFBdkIsQ0FsQ2lEO0NBQXpCOztBQXVDaEMsT0FBTyxPQUFQLEdBQWlCLEtBQWpCIiwiZmlsZSI6InNraXJhLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgYnVsayA9IHJlcXVpcmUoXCJidWxrLXJlcXVpcmVcIilcclxuY29uc3QgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIikoXCJza2lyYVwiKVxyXG5jb25zdCBmb3JrID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIikuZm9ya1xyXG5jb25zdCBwb3J0ZmluZGVyID0gcmVxdWlyZShcInBvcnRmaW5kZXJcIilcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIFNraXJhKHBvcnQpIHtcclxuXHR0aGlzLnBvcnQgPSBwb3J0IHx8IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdHBvcnRmaW5kZXIuZ2V0UG9ydCgoZXJyLCBwb3J0KSA9PiB7XHJcblx0XHRcdGVyciAmJiByZWplY3QoZXJyKSB8fCByZXNvbHZlKHBvcnQpXHJcblx0XHR9KVxyXG5cdH0pXHJcblx0ZGVidWcoXCJDaG9zZW4gJWQgYXMgcHJveHkgcG9ydC5cIiwgdGhpcy5wb3J0KVxyXG5cclxuXHRhd2FpdCB0aGlzLmNyZWF0ZVRhc2tzKClcclxuXHR0aGlzLm1hcFRyaWdnZXJzKClcclxuXHR0aGlzLm1hcFdhdGNoZXJzKClcclxuXHRhd2FpdCB0aGlzLmF1dG9TdGFydCgpXHJcblx0dGhpcy5kZXBsb3lXYXRjaGVyKClcclxufVxyXG5cclxuU2tpcmEucHJvdG90eXBlLkJBU0VfVEFTS1MgPSBidWxrKF9fZGlybmFtZSArIFwiL3Rhc2tzXCIsIFwiKi5qc1wiKVxyXG5cclxuU2tpcmEucHJvdG90eXBlLmNyZWF0ZVRhc2tzID0gYXN5bmMgZnVuY3Rpb24gY3JlYXRlVGFza3MoKSB7XHJcblx0dGhpcy50YXNrcyA9IHt9XHJcblx0bGV0IGpvYnMgPSBbXVxyXG5cclxuXHRmb3IgKGxldCB0YXNrTmFtZSBpbiB0aGlzLkJBU0VfVEFTS1MpIHtcclxuXHRcdGpvYnMucHVzaCgoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRsZXQgdGFza09iamVjdCA9IHRoaXMuQkFTRV9UQVNLU1t0YXNrTmFtZV1cclxuXHRcdFx0bGV0IGJhc2UgPSBPYmplY3QuY3JlYXRlKHRhc2tPYmplY3QucHJvdG90eXBlIHx8IHRhc2tPYmplY3QpXHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHRhc2tPYmplY3QgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0bGV0IG91dCA9IGF3YWl0IFByb21pc2UucmVzb2x2ZSh0YXNrT2JqZWN0LmNhbGwoYmFzZSwgdGhpcykpXHJcblx0XHRcdFx0YmFzZSA9IG91dCB8fCBiYXNlXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMudGFza3NbdGFza05hbWVdID0gYmFzZVxyXG5cdFx0fSkoKSlcclxuXHR9XHJcblxyXG5cdGF3YWl0IFByb21pc2UuYWxsKGpvYnMpXHJcbn1cclxuXHJcblNraXJhLnByb3RvdHlwZS5tYXBUcmlnZ2VycyA9IGZ1bmN0aW9uIG1hcFRyaWdnZXJzKCkge1xyXG5cdHRoaXMudHJpZ2dlcnMgPSB7fVxyXG5cclxuXHRmb3IgKGxldCB0YXNrTmFtZSBpbiB0aGlzLnRhc2tzKSB7XHJcblx0XHRsZXQgdGFzayA9IHRoaXMudGFza3NbdGFza05hbWVdXHJcblxyXG5cdFx0Ly8gdHJpZ2dlcldvcmQgY2FuIGJlIFwiYWZ0ZXJcIiwgXCJ3aXRoXCIsIGV0Yy5cclxuXHRcdGZvciAobGV0IHRyaWdnZXJXb3JkIGluIHRhc2sudHJpZ2dlcnMgfHwge30pIHtcclxuXHRcdFx0Ly8gSWYgbm90IGFuIG9iamVjdCB5ZXQsIGNyZWF0ZSBpdC5cclxuXHRcdFx0aWYgKCF0aGlzLnRyaWdnZXJzW3RyaWdnZXJXb3JkXSkge1xyXG5cdFx0XHRcdHRoaXMudHJpZ2dlcnNbdHJpZ2dlcldvcmRdID0ge31cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IHdvcmRCYXNlZFRyaWdnZXJzID0gdGhpcy50cmlnZ2Vyc1t0cmlnZ2VyV29yZF1cclxuXHJcblx0XHRcdC8vIFRoaXMgYXJyYXkgY29udGFpbnMgYWxsIHRhc2sgbmFtZXMgd2hpY2ggd2lsbCB0cmlnZ2VyIHRoaXMgdGFzay5cclxuXHRcdFx0bGV0IHRhcmdldFRhc2tzID0gW10uY29uY2F0KHRhc2sudHJpZ2dlcnNbdHJpZ2dlcldvcmRdKVxyXG5cclxuXHRcdFx0Zm9yIChsZXQgdGFyZ2V0VGFza05hbWUgb2YgdGFyZ2V0VGFza3MpIHtcclxuXHRcdFx0XHRpZiAoIXdvcmRCYXNlZFRyaWdnZXJzW3RhcmdldFRhc2tOYW1lXSkge1xyXG5cdFx0XHRcdFx0d29yZEJhc2VkVHJpZ2dlcnNbdGFyZ2V0VGFza05hbWVdID0gW11cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHdvcmRCYXNlZFRyaWdnZXJzW3RhcmdldFRhc2tOYW1lXS5wdXNoKHRhc2tOYW1lKVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5Ta2lyYS5wcm90b3R5cGUubWFwV2F0Y2hlcnMgPSBmdW5jdGlvbiBtYXBXYXRjaGVycygpIHtcclxuXHR0aGlzLndhdGNoZXJzID0ge31cclxuXHJcblx0Zm9yIChsZXQgdGFza05hbWUgaW4gdGhpcy50YXNrcykge1xyXG5cdFx0bGV0IHRhc2sgPSB0aGlzLnRhc2tzW3Rhc2tOYW1lXVxyXG5cclxuXHRcdGlmICh0YXNrLnRyaWdnZXJzICYmIHRhc2sudHJpZ2dlcnMud2F0Y2gpIHtcclxuXHRcdFx0bGV0IHBhdHRlcm5zID0gW10uY29uY2F0KHRhc2sudHJpZ2dlcnMud2F0Y2gpXHJcblx0XHRcdHRoaXMud2F0Y2hlcnNbdGFza05hbWVdID0gcGF0dGVybnNcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcblNraXJhLnByb3RvdHlwZS5leGVjVGFzayA9IGFzeW5jIGZ1bmN0aW9uIGV4ZWNUYXNrKHRhc2tOYW1lKSB7XHJcblx0ZGVidWcoXCJBdHRlbXB0IHRvIHJ1biB0YXNrICVzLlwiLCB0YXNrTmFtZSlcclxuXHRsZXQgdGFzayA9IHRoaXMudGFza3NbdGFza05hbWVdXHJcblxyXG5cdGlmICghdGFzaykge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gc3VjaCB0YXNrOiBcIiArIHRhc2tOYW1lKVxyXG5cdH1cclxuXHJcblx0dHJ5IHtcclxuXHRcdGlmICh0eXBlb2YgdGFzay5maWx0ZXIgPT0gXCJmdW5jdGlvblwiICYmICF0YXNrLmZpbHRlcih0aGlzKSkge1xyXG5cdFx0XHRkZWJ1ZyhcIlRhc2sgJXMgd2FzIGZpbHRlcmVkLlwiLCB0YXNrTmFtZSlcclxuXHJcblx0XHRcdGlmICh0YXNrLnByZXBhcmVkICYmIHR5cGVvZiB0YXNrLmNsZWFudXAgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0ZGVidWcoXCJDbGVhbmluZyB1cCAlcy5cIiwgdGFza05hbWUpXHJcblx0XHRcdFx0dGFzay5jbGVhbnVwKClcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlXHJcblx0XHR9XHJcblx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHR0YXNrLmVycm9yID0gW10uY29uY2F0KHRhc2suZXJyb3IgfHwgW10pLmNvbmNhdChlcnIpXHJcblx0XHRkZWJ1ZyhcIkVycm9yIHdoaWxlIGNoZWNraW5nIGZpbHRlciBvZiAlczpcXG5cIiwgdGFza05hbWUsIGVyci5zdGFjayB8fCBlcnIpXHJcblx0fVxyXG5cclxuXHRpZiAodGFzay5idXN5KSB7XHJcblx0XHRkZWJ1ZyhcIlRhc2sgJXMgaXMgYWxyZWFkeSBleGVjdXRpbmcuIFF1ZXVlaW5nIHVwLlwiLCB0YXNrTmFtZSlcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoLi4uYXJncykgPT4gdGFzay5xdWV1ZS5wdXNoKGFyZ3MpKVxyXG5cdH1cclxuXHJcblx0dHJ5IHtcclxuXHRcdGlmICghdGFzay5wcmVwYXJlZCAmJiB0eXBlb2YgdGFzay5wcmVwYXJlID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRkZWJ1ZyhcIlByZXBhcmluZyB0YXNrICVzLlwiLCB0YXNrTmFtZSlcclxuXHRcdFx0YXdhaXQgUHJvbWlzZS5yZXNvbHZlKHRhc2sucHJlcGFyZSh0aGlzKSlcclxuXHRcdFx0dGFzay5wcmVwYXJlZCA9IHRydWVcclxuXHRcdH1cclxuXHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdHRhc2suZXJyb3IgPSBbXS5jb25jYXQodGFzay5lcnJvciB8fCBbXSkuY29uY2F0KGVycilcclxuXHRcdGRlYnVnKFwiRXJyb3Igd2hpbGUgcHJlcGFyaW5nICVzOlxcblwiLCB0YXNrTmFtZSwgZXJyLnN0YWNrIHx8IGVycilcclxuXHR9XHJcblxyXG5cdHRhc2suYnVzeSA9IHRydWVcclxuXHR0YXNrLmVycm9yID0gW11cclxuXHR0YXNrLnF1ZXVlID0gW11cclxuXHR0YXNrLmxhc3RleGVjID0gbmV3IERhdGUoKVxyXG5cclxuXHR0cnkge1xyXG5cdFx0ZGVidWcoXCJFeGVjdXRpbmcgdGFzayAlcy5cIiwgdGFza05hbWUpXHJcblx0XHRhd2FpdCBQcm9taXNlLnJlc29sdmUodGFzay5leGVjdXRlKHRoaXMpKVxyXG5cdFx0dGFzay5sYXN0dXBkYXRlID0gbmV3IERhdGUoKVxyXG5cdFx0ZGVidWcoXCJTdWNjZXNzZnVsbHkgZXhlY3V0ZWQgdGFzayAlcy5cIiwgdGFza05hbWUpXHJcblxyXG5cdFx0bGV0IHRyaWdnZXJlZEFmdGVyID0gdGhpcy50cmlnZ2Vycy5hZnRlclt0YXNrTmFtZV0gfHwgW11cclxuXHRcdGxldCBuYW1lcyA9IHRyaWdnZXJlZEFmdGVyLmpvaW4oXCIsIFwiKSB8fCBcIm5vbmVcIlxyXG5cdFx0ZGVidWcoXCJFeGVjdXRpbmcgdGFza3MgdHJpZ2dlcmVkIGJ5ICVzOiAlc1wiLCB0YXNrTmFtZSwgbmFtZXMpXHJcblx0XHR0aGlzLm11bHRpU3RhcnQodHJpZ2dlcmVkQWZ0ZXIpXHJcblx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHR0YXNrLmVycm9yLnB1c2goZXJyKVxyXG5cdFx0ZGVidWcoXCJFcnJvciB3aGlsZSBleGVjdXRpbmcgJXM6XFxuXCIsIHRhc2tOYW1lLCBlcnIuc3RhY2sgfHwgZXJyKVxyXG5cdH1cclxuXHJcblx0dGFzay5idXN5ID0gZmFsc2VcclxuXHJcblx0aWYgKHRhc2sucXVldWUgJiYgdGFzay5xdWV1ZS5sZW5ndGgpIHtcclxuXHRcdGRlYnVnKFwiRXhlY3V0aW5nIGZvciB0aGUgcXVldWUgKCVkKSBmb3IgJXMuXCIsIHRhc2sucXVldWUubGVuZ3RoLCB0YXNrTmFtZSlcclxuXHRcdGxldCBjYWxsYmFja3MgPSB0YXNrLnF1ZXVlXHJcblxyXG5cdFx0c2V0SW1tZWRpYXRlKGFzeW5jICgpID0+IHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmV4ZWNUYXNrKHRhc2tOYW1lKVxyXG5cclxuXHRcdFx0XHRkZWJ1ZyhcIlN1Y2Nlc3NmdWxseSBleGVjdXRlZCBxdWV1ZSB0YXNrICVzLlwiLCB0YXNrTmFtZSlcclxuXHRcdFx0XHRjYWxsYmFja3MuZm9yRWFjaChhcmdzID0+IHNldEltbWVkaWF0ZShhcmdzWzBdKSlcclxuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0ZGVidWcoXCJFcnJvciB3aGlsZSBleGVjdXRpbmcgcXVldWUgdGFzayAlcy5cIiwgdGFza05hbWUpXHJcblx0XHRcdFx0Y2FsbGJhY2tzLmZvckVhY2goYXJncyA9PiBzZXRJbW1lZGlhdGUoKCkgPT4gYXJnc1sxXShlcnIpKSlcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdGlmICh0aGlzLnRyaWdnZXJzLnJlc3RhcnQgJiYgdGhpcy50cmlnZ2Vycy5yZXN0YXJ0LnRydWUuaW5kZXhPZih0YXNrTmFtZSkgIT0gLTEpIHtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKVxyXG5cdFx0cmV0dXJuIHRoaXMuZXhlY1Rhc2sodGFza05hbWUpXHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5Ta2lyYS5wcm90b3R5cGUubXVsdGlTdGFydCA9IGZ1bmN0aW9uIG11bHRpU3RhcnQodGFza05hbWVBcnJheSkge1xyXG5cdGZvciAobGV0IHRhcmdldFRhc2tOYW1lIG9mIHRhc2tOYW1lQXJyYXkgfHwgW10pIHtcclxuXHRcdHNldEltbWVkaWF0ZSgoKSA9PiB0aGlzLmV4ZWNUYXNrKHRhcmdldFRhc2tOYW1lKSlcclxuXHR9XHJcbn1cclxuXHJcblNraXJhLnByb3RvdHlwZS5hdXRvU3RhcnQgPSBhc3luYyBmdW5jdGlvbiBzdGFydEF1dG8oKSB7XHJcblx0bGV0IHRvU3RhcnQgPSBbXVxyXG5cclxuXHRpZiAodGhpcy50cmlnZ2Vycy5hdXRvKSB7XHJcblx0XHRmb3IgKGxldCB0YXNrTmFtZSBvZiB0aGlzLnRyaWdnZXJzLmF1dG8udHJ1ZSB8fCB7fSkge1xyXG5cdFx0XHR0b1N0YXJ0LnB1c2godGhpcy5leGVjVGFzayh0YXNrTmFtZSkpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRhd2FpdCBQcm9taXNlLmFsbCh0b1N0YXJ0KVxyXG59XHJcblxyXG5Ta2lyYS5wcm90b3R5cGUuZGVwbG95V2F0Y2hlciA9IGZ1bmN0aW9uIGRlcGxveVdhdGNoZXIoKSB7XHJcblx0bGV0IGFyZ3MgPSBPYmplY3Qua2V5cyh0aGlzLnRyaWdnZXJzLndhdGNoKVxyXG5cclxuXHRjb25zdCB3YXRjaFByb2MgPSBhc3luYyAoYXJncykgPT4ge1xyXG5cdFx0bGV0IHdhdGNoZXIgPSBmb3JrKHJlcXVpcmUucmVzb2x2ZShcIi4vd2F0Y2hcIiksIGFyZ3MpXHJcblxyXG5cdFx0d2F0Y2hlci5vbihcIm1lc3NhZ2VcIiwgKG0pID0+IHtcclxuXHRcdFx0aWYgKG0udXBkYXRlKSB7XHJcblx0XHRcdFx0dGhpcy5tdWx0aVN0YXJ0KHRoaXMudHJpZ2dlcnMud2F0Y2hbbS51cGRhdGVdKVxyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0d2F0Y2hlci5vbihcImV4aXRcIiwgZXJyb3JDb2RlID0+IHtcclxuXHRcdFx0XHRpZiAoZXJyb3JDb2RlKSB7XHJcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKFwiRXhpdGVkIHdpdGggZXJyb3IgY29kZSBcIiArIGVycm9yQ29kZSkpXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJlc29sdmUoKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRzZXRJbW1lZGlhdGUoYXN5bmMgKCkgPT4ge1xyXG5cdFx0d2hpbGUgKHRydWUpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRhd2FpdCB3YXRjaFByb2MoYXJncylcclxuXHRcdFx0XHRicmVha1xyXG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSlcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblxyXG5cdHJldHVybiBmdW5jdGlvbiBraWxsV2F0Y2hlcigpIHtcclxuXHRcdHdhdGNoZXIua2lsbCgpXHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNraXJhXHJcbiJdfQ==