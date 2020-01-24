const ethers = require("ethers");
const fs = require('fs');
const renderer = require("./render.js")

// enforce that a file and token address was provided
if (process.argv.length < 4) {
	console.log("Please provide a file, ie 'node render.js [name] [address]'")
	return
}

// get the filename from the 3rd argument
// TODO read the layout from the token ID
var file = process.argv[2];
var path = "layouts/" + file + "/layout.json"
let layout = JSON.parse(fs.readFileSync(path));

// get the token address from the 4th argument
var tokenAddress = process.argv[3];

var blockNum = -1;
if (process.argv.length > 4) {
	blockNum = process.argv[4]	
}

// TODO use a token id
renderer.process(tokenAddress, 0, blockNum, layout, (finalImage, blockNum) => {
	path = "renders/" + file + "_" + blockNum + ".png";
	
	finalImage.write(path)

	console.log("Wrote to " + path)
});