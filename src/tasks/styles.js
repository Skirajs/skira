const fs = require("fs-promise")
const less = require("less")

function StylesTask() {
}

module.exports = StylesTask

StylesTask.prototype.triggers = {
	after: "project",
	watch: "styles",
}

StylesTask.prototype.execute = async function execute(skira) {
	let filename = "styles/index.less"

	// read the less code
	let code = await fs.readFile(filename, "utf8")
	let output

	try {
		// render less to css
		output = await less.render(code, {
			// specify the filename for imports and errors
			filename: filename,
			// include the sourcemap for debugging
			sourceMap: {
				// do not put it in a separate file
				sourceMapFileInline: true,
			},
		})
	} catch (err) {
		err.extract.splice(2, 0, " ".repeat(err.column) + "^")

		let extract = err.extract
			// change undefined lines to empty ones
			.map((line) => line || "")
			// indent, style and mark every line
			.map((line, index) => (
				// indent every line and add an arrow on the guilty line
				"  " + (index == 1 ? ">" : " ") + " " +
				// prefix every line with a pipe character except for the cursor
				(index != 2 ? "|" : " ") + " " + line
			))
			// add an additional empty line
			.concat("")
			// create a string
			.join("\n")

		throw new Error(
			`Parsing file ${err.filename}: ${err.message}` +
			`(${err.line}:${err.column})\n${extract}`
		)
	}

	// write css output to file
	await fs.writeFile(skira.project.builds.styles, output.css)
}
