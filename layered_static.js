var Jimp = require('jimp');

function render(layout, currentImage, layerIndex) {
	if (layerIndex >= layout.layers.length) {
		currentImage.write('output.jpg'); // save

		console.log("Wrote to output.jpg")
		return;
	}

	var baseLayerImage = null;

	// TODO sort layers by z_order
	var layer = layout.layers[layerIndex]

	var control = layout.controls.filter(x => x.layer === layer.id)[0];

	var selectedComponentID = control.component_options[control.value]
	
	var selectedComponent = layout.components.filter(x => x.id === selectedComponentID)[0];

	Jimp.read(selectedComponent.uri, (err, layerImage) => {
		if (err) throw err;			
			
		if (currentImage !== null) {
			currentImage.composite(layerImage, selectedComponent.x, selectedComponent.y);

			render(layout, currentImage, layerIndex + 1)
		} else {
			render(layout, layerImage, layerIndex + 1)
		}
	})	
}

exports.render = render