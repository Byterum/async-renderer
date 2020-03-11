const renderer = require("./render.js")
var ethers = require("ethers");

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

function parseBool(val) { return val === true || val === "true" }

async function main() {
	// ie "https://rinkeby.infura.io/v3/xxx"
	const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);

	var finalImageData = await renderer.process(provider, tokenAddress, tokenId, blockNum, parseBool(process.env.STAMP_DEBUG));

	if (finalImageData.image === null) {
		console.log(finalImageData.error);
	} else {
		// determine the render path
		var path = "renders/token-" + tokenId + "_block-" + finalImageData.blockNum + ".jpg";
		// output to console
		console.log("Writing to " + path + "...");
		// write the final artwork
		finalImageData.image.write(path);
		// output to console
		console.log("Wrote to " + path + ".");
	}
}

main();