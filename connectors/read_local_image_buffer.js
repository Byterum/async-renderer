const fs = require('fs');

async function loadFromURI(uri, callback) {
	fs.readFile(uri, function(err, data) {
		if (err) throw err;
		
		callback(data);
	});
}

exports.loadFromURI = loadFromURI