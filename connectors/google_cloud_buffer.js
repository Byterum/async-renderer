const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

const bucketName='async-art-renderer.appspot.com';

async function loadFromURI(uri, callback) {
	const file = storage.bucket(bucketName).file(uri + ".png");	

	file.download(function(err, contents) {
		if (err) throw err;

		callback(contents)
	}); 

}

exports.loadFromURI = loadFromURI