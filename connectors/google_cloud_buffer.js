const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

const bucketName='async-art-renderer.appspot.com';

async function loadFromURI(uri, callback) {
	const file = storage.bucket(bucketName).file(uri);	

	var buffer = await file.download()

	return buffer[0];
}

exports.loadFromURI = loadFromURI