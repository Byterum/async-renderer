var Jimp = require('jimp');

async function render(contract, layout, currentImage, layerIndex, callback) {
	if (layerIndex >= layout.layers.length) {		
		callback(currentImage)
		return		
	}

	var baseLayerImage = null;

	// TODO sort layers by z_order
	var layer = layout.layers[layerIndex]

	var layerType = layer.type;

	if (layerType === "dynamic") {
		var currentIndex = parseInt((await contract.getControlLeverValue(layer.token_id, layer.lever_id)).toString())

		layer = layer.options[currentIndex];
	}

	Jimp.read(layer.uri, (err, layerImage) => {
		if (err) throw err;			

		OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback);
	})	
}

async function readIntProperty(contract, object, key, label) {
	var value = object[key];

	// check if value is an object. If so then we need to check the contract value
	if (typeof value === "object") {
		value = parseInt((await contract.getControlLeverValue(object[key]["token_id"], object[key]["lever_id"])).toString());		
		console.log("Fetching " + label + " value from contract...");
	}
	console.log(label + " = " + value);

	return value;
}

async function OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback) {
	if (currentImage !== null) {
		// scale the layer
		var scale_x = (await readIntProperty(contract, layer.scale, "x", "Layer Scale X")) / 100;
		var scale_y = (await readIntProperty(contract, layer.scale, "y", "Layer Scale Y")) / 100;
	
		// determine the new width
		var newWidth = layerImage.bitmap.width * scale_x;
		var newHeight = layerImage.bitmap.height * scale_y;
		// determine the offset to maintain our position
		var x_offset = (layerImage.bitmap.width - newWidth) / 2;
		var y_offset = (layerImage.bitmap.height - newHeight) / 2;
		// resize the image
		layerImage.resize(newWidth, newHeight);

		// rotate the layer
		var rotation = await readIntProperty(contract, layer, "rotation", "Layer Rotation");
		layerImage.rotate(rotation, false);

		// position the layer
		var x = await readIntProperty(contract, layer.position, "x", "Layer Position X");
		var y = await readIntProperty(contract, layer.position, "y", "Layer Position Y");

		x += x_offset;
		y += y_offset;

		// composite this layer onto the current image
		currentImage.composite(layerImage, x, y);

		render(contract, layout, currentImage, layerIndex + 1, callback)
	} else {
		render(contract, layout, layerImage, layerIndex + 1, callback)
	}
}

exports.render = render