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

async function main() {
	var stampDebug = true;

	// const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
	// const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/687d696aa0a440ceadfb06bf931cfe06');
	const provider = new ethers.providers.JsonRpcProvider('https://rinkeby.infura.io/v3/687d696aa0a440ceadfb06bf931cfe06');

	// const provider = new ethers.providers.JsonRpcProvider('https://www.ethercluster.com/goerli');
	// const provider = new ethers.providers.InfuraProvider('goerli');

	var finalImageData = await renderer.process(provider, tokenAddress, tokenId, blockNum, stampDebug);

	// determine the render path
	var path = "renders/token-" + tokenId + "_block-" + finalImageData.blockNum + ".png";
	// output to console
	console.log("Writing to " + path + "...");
	// write the final artwork
	finalImageData.image.write(path);
	// output to console
	console.log("Wrote to " + path + ".");
}

main();