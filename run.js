const ethers = require("ethers");
const fs = require('fs');
const renderer = require("./render.js")

// enforce that a file and token address was provided
if (process.argv.length < 4) {
	console.log("Please use format 'node render.js [tokenAddress] [tokenID]'")
	return
}

// get the token address from the 4th argument
var tokenAddress = process.argv[2];
var tokenId = process.argv[3]
console.log("Using tokenId = " + tokenId);

var blockNum = -1;
if (process.argv.length > 4) {
	blockNum = process.argv[4]	
}
console.log("Using block = " + blockNum)

async function main() {
	var finalImage = await renderer.process(tokenAddress, tokenId, blockNum);

	var path = "renders/token-" + tokenId + "_block-" + blockNum + ".png";
	
	finalImage.write(path);

	console.log("Wrote to " + path)    
}

main();