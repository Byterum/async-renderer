var ethers = require("ethers");
const fs = require('fs');
var Jimp = require('jimp');

// Renderer variants
const layered_static_v1 = require('./layered_static/v1.js')

// Connector variants
// Override here with custome buffer connectors
const bufferConnector = require('./connectors/google_cloud_buffer.js')

const CONTRACT_ABI = JSON.parse(fs.readFileSync("ABI.json"))

// TODO move provider into a separate module too
// const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
const provider = new ethers.providers.InfuraProvider('goerli');

// TODO load the layout from the Token URI instead of being passed in
function process(tokenAddress, tokenId, blockNum, layout) {	
	provider.getNetwork().then((network) => {
		onNetworkLoaded(tokenAddress, tokenId, blockNum, layout);		
	});
}

async function onNetworkLoaded(tokenAddress, tokenId, blockNum, layout) {
	let contract = new ethers.Contract(tokenAddress, CONTRACT_ABI, provider);

	// if no block num was provided then use the latest block number (minus 2 so we don't use a block that is pending currently)
	if (blockNum === -1) {
		blockNum = (await provider.getBlockNumber()) - 2;

		console.log("Retrieved latest block number: " + blockNum);
	}

	var renderer = null;

	if (layout.type === "layered-static") {
		if (layout.version === 1) {
			renderer = layered_static_v1;
		}		
	}

	// set the buffer connector on the renderer
	renderer.setBufferConnector(bufferConnector);
	
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

exports.process = process