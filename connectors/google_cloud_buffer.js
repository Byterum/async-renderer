/*
 * Connector for retrieving a file buffer from google cloud storage.
 * Define GOOGLE_STORAGE_BUCKET and GOOGLE_STORAGE_PATH in your environment settings.
 */
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

const GOOGLE_STORAGE_BUCKET = process.env.GOOGLE_STORAGE_BUCKET;
const GOOGLE_STORAGE_PATH = process.env.GOOGLE_STORAGE_PATH;

async function loadFromURI(uri) {
	// TODO remove this
	if (uri == "alotta/layout.json") {
		uri = "QmcYkb3Bu965bDyBq2K2tCCtCFyWXH5hzjF8KVqJiu1ch3"
	}	

	const file = storage.bucket(GOOGLE_STORAGE_BUCKET).file(GOOGLE_STORAGE_PATH + uri);	

	var buffer = await file.download()

	return buffer[0];
}

exports.loadFromURI = loadFromURI