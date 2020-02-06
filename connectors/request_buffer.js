/*
 * Connector for retrieving a file buffer from a web URI
 */
var rp = require('request-promise');

async function loadFromURI(uri) {
	var response = await rp({uri: uri, encoding: null});

	return Buffer.from(response);
}

exports.loadFromURI = loadFromURI