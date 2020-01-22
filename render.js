var ethers = require("ethers");
const fs = require('fs');
var Jimp = require('jimp');

// Renderer variants
const layered_static_v1 = require('./layered_static/v1.js')

const CONTRACT_ABI = JSON.parse(fs.readFileSync("ABI.json"))

// const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
const PROVIDER = new ethers.providers.InfuraProvider('goerli');

// enforce that a file and contract address was provided
if (process.argv.length < 4) {
	console.log("Please provide a file, ie 'node render.js [name] [address]'")
	return
}

// get the filename from the 3rd argument
// TODO read the layout from the token ID
var file = process.argv[2];
// get the contract address from the 4th argument
var contractAddress = process.argv[3];

var blockNum = -1;
if (process.argv.length > 4) {
	blockNum = process.argv[4]	
}

var path = "layouts/" + file + "/layout.json"

let layout = JSON.parse(fs.readFileSync(path));

PROVIDER.getNetwork().then((network) => {
	let contract = new ethers.Contract(contractAddress, CONTRACT_ABI, PROVIDER);

	Process(contract)
})

async function Process(contract) {
	// if no block num was provided then use the latest block number (minus 2 so we don't use a block that is pending currently)
	if (blockNum === -1) {
		blockNum = (await PROVIDER.getBlockNumber()) - 2;

		console.log("Retrieved latest block number: " + blockNum);
	}

	var renderer = null;

	if (layout.type === "layered-static") {
		if (layout.version === 1) {
			renderer = layered_static_v1;
		}		
	}
	
	renderer.render(contract, layout, null, 0, blockNum, (finalImage) => {
		
		stampBlockNumber(finalImage, () => {
			path = "renders/" + file + "_" + blockNum + ".png";
	
			finalImage.write(path)

			console.log("Wrote to " + path)
		});
	});
}

async function stampBlockNumber(image, callback) {
	var stampX = image.bitmap.width - 350;
	var stampY = image.bitmap.height - 50;

	image.scan(stampX, stampY, 350, 50, function (x, y, offset) {
		image.setPixelColor(0, x, y)
	});

	Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(font => {
	 	image.print(font, stampX + 25, stampY + 9, "Block #" + blockNum);

	 	callback();
	});
}