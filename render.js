const fs = require('fs');
const layered_static = require('./layered_static.js')

// TODO get file name from parameters
var file = "julius"

var layoutRaw = fs.readFileSync(file + "/layout.json")
let layout = JSON.parse(layoutRaw);

var imageType = layout.type;

if (imageType === "layered-static") {
	layered_static.render(layout, null, 0)
}