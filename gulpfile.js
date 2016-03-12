const gulp = require("gulp")
const jscs = require("gulp-jscs")

gulp.task("default", () => (
	// TODO: read from package.json?
	gulp.src("*/**/.js")
		.pipe(jscs())
		.pipe(jscs.reporter())
))
