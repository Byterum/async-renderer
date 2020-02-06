/*
 * Connector for retrieving a file buffer from just an IPFS hash.
 * Define IPFS_GATEWAY in your environment settings.
 */
var rp = require('request-promise');

const IPFS_GATEWAY = process.env.IPFS_GATEWAY;

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