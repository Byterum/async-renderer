// const fs = require('fs').promises;
const fs = require('fs')
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)

async function loadFromURI(uri) {
	return await readFileAsync(uri)
}

exports.loadFromURI = loadFromURI