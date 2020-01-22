var ethers = require("ethers");
const fs = require('fs');
const layered_static_v1 = require('./layered_static/v1.js')

var CONTRACT_ABI = JSON.parse(fs.readFileSync("ABI.json"))
// const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
let provider = new ethers.providers.InfuraProvider('goerli');

// enforce that a file and contract address was provided
if (process.argv.length < 4) {
	console.log("Please provide a file, ie 'node render.js [name] [address]'")
	return
}

// get the filename from the 3rd argument
var file = process.argv[2];
var path = "art/" + file + "/layout.json"

// get the contract address from the 4th argument
var contractAddress = process.argv[3];

var layoutRaw = fs.readFileSync(path)
let layout = JSON.parse(layoutRaw);
var imageType = layout.type;
var imageVersion = layout.version;

provider.getNetwork().then((network) => {
	let contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

	Process(contract)
})

async function Process(contract) {
	var renderer = null;

	if (imageType === "layered-static") {
		if (imageVersion === 1) {
			renderer = layered_static_v1;
		}		
	}
	
	renderer.render(contract, layout, null, 0, (finalImage) => {
		path = "renders/" + file + ".png";
	
		finalImage.write(path)

		console.log("Wrote to " + path)
	});
}