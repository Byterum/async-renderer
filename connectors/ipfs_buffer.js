/*
 * Connector for retrieving a file buffer from just an IPFS hash.
 * Define IPFS_GATEWAY in your environment settings.
 */
var rp = require('request-promise');

const IPFS_GATEWAY = process.env.IPFS_GATEWAY;

async function loadFromURI(ipfsHash) {	
	var uri = IPFS_GATEWAY + ipfsHash

	console.log(uri)

	var response = await rp({uri: uri, encoding: null});

	return Buffer.from(response);
}

exports.loadFromURI = loadFromURI