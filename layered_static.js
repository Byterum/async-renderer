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
		var currentIndex = parseInt((await contract.getControlLeverValue(layer.control_token, layer.control_lever)).toString())

		layer = layer.options[currentIndex];
	}

	Jimp.read(layer.uri, (err, layerImage) => {
		if (err) throw err;			

		OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback);
	})	
}

async function OnImageRead(contract, currentImage, layout, layer, layerImage, layerIndex, callback) {
	if (currentImage !== null) {
		var x = layer.x;
		var y = layer.y;			

		if (typeof x === "object") {
			x = parseInt((await contract.getControlLeverValue(layer.x.control_token, layer.x.control_lever)).toString());
			console.log(x)
		}

		if (typeof y === "object") {
			y = parseInt((await contract.getControlLeverValue(layer.y.control_token, layer.y.control_lever)).toString());
			console.log(y)
		}

		currentImage.composite(layerImage, x, y);

		render(contract, layout, currentImage, layerIndex + 1, callback)
	} else {
		render(contract, layout, layerImage, layerIndex + 1, callback)
	}
}

exports.render = render