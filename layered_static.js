var Jimp = require('jimp');

function render(layout, currentImage, layerIndex, callback) {
	if (layerIndex >= layout.layers.length) {		
		callback(currentImage)
		return		
	}

	var baseLayerImage = null;

	// TODO sort layers by z_order
	var layer = layout.layers[layerIndex]

	var layerType = layer.type;

	if (layerType === "dynamic") {
		layer = layer.options[layer.index]
	}

	Jimp.read(layer.uri, (err, layerImage) => {
		if (err) throw err;			
			
		if (currentImage !== null) {
			var x = layer.x;
			var y = layer.y;			

			if (typeof x === "object") {
				x = layer.x.value;
			}
	
			if (typeof y === "object") {
				y = layer.y.value;
			}

			currentImage.composite(layerImage, x, y);

			render(layout, currentImage, layerIndex + 1, callback)
		} else {
			render(layout, layerImage, layerIndex + 1, callback)
		}
	})	
}

exports.render = render