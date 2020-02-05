var rp = require('request-promise');

// use the public IFPS gateway
const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

async function loadFromURI(ipfsHash) {	
	if (ipfsHash == "alotta/layout.json") {
		ipfsHash = "Qmd4d6g9XCbsjbKG5Qb9idkZhxn1Sbiuxwga5QSFnRqtft"
	}
	
	var uri = IPFS_GATEWAY + ipfsHash

	console.log(uri)

	var response = await rp({uri: uri, encoding: null});

	return Buffer.from(response);
}

exports.loadFromURI = loadFromURI