var Jimp = require('jimp');

const KEY_ROTATION = "rotation";
const KEY_SCALE = "scale";
const KEY_POSITION = "position";
const KEY_X = "x";
const KEY_Y = "y";
const KEY_VISIBLE = "visible";

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

		var isVisible = false;
		// check if this layer has visbility controls
		if (KEY_VISIBLE in layer) {
			isVisible = (await readIntProperty(contract, layer, KEY_VISIBLE, "Layer Visible")) === 1;
		}

		if (isVisible) {
			// scale the layer (optionally)
			var x_offset = 0;
			var y_offset = 0;

			if (KEY_SCALE in layer) {
				var scale_x = (await readIntProperty(contract, layer[KEY_SCALE], KEY_X, "Layer Scale X")) / 100;
				var scale_y = (await readIntProperty(contract, layer[KEY_SCALE], KEY_Y, "Layer Scale Y")) / 100;
			
				// determine the new width
				var newWidth = layerImage.bitmap.width * scale_x;
				var newHeight = layerImage.bitmap.height * scale_y;
				// determine the offset to maintain our position
				x_offset = (layerImage.bitmap.width - newWidth) / 2;
				y_offset = (layerImage.bitmap.height - newHeight) / 2;
				// resize the image
				layerImage.resize(newWidth, newHeight);
			}

			// rotate the layer (optionally)
			if (KEY_ROTATION in layer) {
				var rotation = await readIntProperty(contract, layer, KEY_ROTATION, "Layer Rotation");
				layerImage.rotate(rotation, false);
			}

			var x = 0;
			var y = 0;

			// position the layer (optionally)
			if (KEY_POSITION in layer) {
				x = await readIntProperty(contract, layer[KEY_POSITION], KEY_X, "Layer Position X");
				y = await readIntProperty(contract, layer[KEY_POSITION], KEY_Y, "Layer Position Y");

				x += x_offset;
				y += y_offset;
			}

			// composite this layer onto the current image
			currentImage.composite(layerImage, x, y);
		}

		render(contract, layout, currentImage, layerIndex + 1, callback)
	} else {
		render(contract, layout, layerImage, layerIndex + 1, callback)
	}
}

exports.render = render