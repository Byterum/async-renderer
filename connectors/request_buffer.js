var request = require('request').defaults({ encoding: null });

async function loadFromURI(uri, callback) {
	request(uri, function (error, response, body) {
		callback(body)
	})
}

exports.loadFromURI = loadFromURI