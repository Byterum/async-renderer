const fs = require('fs');
const layered_static = require('./layered_static.js')

// enforce that a file was provided
if (process.argv.length < 3) {
	console.log("Please provide a file.")
	return
}

// get the file from the 3rd argument
var file = process.argv[2];

var path = "art/" + file + "/layout.json"

var layoutRaw = fs.readFileSync(path)

let layout = JSON.parse(layoutRaw);

var imageType = layout.type;

if (imageType === "layered-static") {
	layered_static.render(layout, null, 0, (finalImage) => {
		path = "renders/" + file + ".png";
		
		finalImage.write(path)

		console.log("Wrote to " + path)
	})
}