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

async function OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback) {
	if (currentImage !== null) {
		// rotate the layer
		var rotation = layer.rotation;

		if (typeof rotation === "object") {
			rotation = parseInt((await contract.getControlLeverValue(layer.rotation.token_id, layer.rotation.lever_id)).toString());
			console.log("Rotation = " + rotation);
		}

		layerImage.rotate(rotation, false);

		// position the layer
		var x = layer.x;
		var y = layer.y;			

		if (typeof x === "object") {
			x = parseInt((await contract.getControlLeverValue(layer.x.token_id, layer.x.lever_id)).toString());
			console.log("X = " + x)
		}

		if (typeof y === "object") {
			y = parseInt((await contract.getControlLeverValue(layer.y.token_id, layer.y.lever_id)).toString());
			console.log("Y = " + y)
		}

		currentImage.composite(layerImage, x, y);

		render(contract, layout, currentImage, layerIndex + 1, callback)
	} else {
		render(contract, layout, layerImage, layerIndex + 1, callback)
	}
}

exports.render = render