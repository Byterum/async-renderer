var Jimp = require('jimp');

function render(layout) {

	// TODO sort layers by z_order
	layout.layers.forEach(layer => {
		var control = layout.controls.filter(x => x.layer === layer.id)[0];

		var selectedComponentID = control.component_options[control.value]
		
		var selectedComponent = layout.components.filter(x => x.id === selectedComponentID)[0];

		console.log(selectedComponent.uri)

		Jimp.read(selectedComponent.uri, (err, bg) => {
			if (err) throw err;

  			bg.write('output2.jpg'); // save
		});


	})

	

	
}

exports.render = render