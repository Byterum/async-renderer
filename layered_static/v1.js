var Jimp = require('jimp');

const KEY_ROTATION = "rotation";
const KEY_SCALE = "scale";
const KEY_COLOR = "color";
const KEY_ALPHA = "alpha";
const KEY_POSITION = "position";
const KEY_X = "x";
const KEY_Y = "y";
const KEY_VISIBLE = "visible";
const KEY_URI = "uri";

async function render(contract, layout, currentImage, layerIndex, callback) {
	if (layerIndex >= layout.layers.length) {		
		callback(currentImage)
		return		
	}

	console.log("rendering layer: " + (layerIndex + 1) + " of " + layout.layers.length);

	// TODO sort layers by z_order?
	var layer = layout.layers[layerIndex];

	if (typeof layer.uri === "object") {
		var uriIndex = await readIntProperty(contract, layer, KEY_URI, "Layer Index");

		layer = layer.uri.options[uriIndex];
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
		var tokenId = object[key]["token_id"];
		var leverId = object[key]["lever_id"];
		
		console.log("Fetching " + label + " value from contract. TokenId=" + tokenId + ", LeverId=" + leverId);

		var controlLever = (await contract.getControlLever(tokenId, leverId));
		
		value = parseInt(controlLever[2].toString());
	}
	console.log("	" + label + " = " + value);

	return value;
}

async function OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback) {
	if (currentImage !== null) {
		// each layer visible by default
		var isVisible = true;		
		// check if this layer has visbility controls
		if (KEY_VISIBLE in layer) {
			isVisible = (await readIntProperty(contract, layer, KEY_VISIBLE, "Layer Visible")) === 1;
		}

		if (isVisible) {
			// scale the layer (optionally)
			var bitmapWidth = layerImage.bitmap.width;
			var bitmapHeight = layerImage.bitmap.height;

			if (KEY_SCALE in layer) {
				var scale_x = (await readIntProperty(contract, layer[KEY_SCALE], KEY_X, "Layer Scale X")) / 100;
				var scale_y = (await readIntProperty(contract, layer[KEY_SCALE], KEY_Y, "Layer Scale Y")) / 100;
				// determine the new width
				bitmapWidth = layerImage.bitmap.width * scale_x;
				bitmapHeight = layerImage.bitmap.height * scale_y;
				// resize the image
				layerImage.resize(bitmapWidth, bitmapHeight);
			}

			// rotate the layer (optionally)
			if (KEY_ROTATION in layer) {
				var rotation = await readIntProperty(contract, layer, KEY_ROTATION, "Layer Rotation");
				layerImage.rotate(rotation, false);
			}

			// offset x and y so that layers are drawn at the center of their image
			var x = -bitmapWidth / 2;
			var y = -bitmapHeight / 2;
			
			// position the layer (optionally)
			if (KEY_POSITION in layer) {
				x = await readIntProperty(contract, layer[KEY_POSITION], KEY_X, "Layer Position X");
				y = await readIntProperty(contract, layer[KEY_POSITION], KEY_Y, "Layer Position Y");

				x -= bitmapWidth / 2;
				y -= bitmapHeight / 2;
			}

			// adjust the color
			if (KEY_COLOR in layer) {
				var alpha = await readIntProperty(contract, layer[KEY_COLOR], KEY_ALPHA, "Layer Alpha"); 

				layerImage.opacity(alpha / 100);
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