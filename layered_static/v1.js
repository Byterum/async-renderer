//var heapdump = require('heapdump');
var Jimp = require('jimp');
var ethers = require("ethers");

const KEY_FIXED_ROTATION = "fixed-rotation";
const KEY_ORBIT_ROTATION = "orbit-rotation";
const KEY_ANCHOR = "anchor";
const KEY_SCALE = "scale";
const KEY_COLOR = "color";
const KEY_ALPHA = "alpha";
const KEY_FIXED_POSITION = "fixed-position";
const KEY_RELATIVE_POSITION = "relative-position";
const KEY_X = "x";
const KEY_Y = "y";
const KEY_VISIBLE = "visible";
const KEY_URI = "uri";
const KEY_STATES = "states";
const KEY_WIDTH = "width";
const KEY_HEIGHT = "height";

var blockNum = -1;
var bufferConnector = null;
var masterArtTokenId = 0;

var controlTokenCache = {}

function setBufferConnector(_bufferConnector) {
	bufferConnector = _bufferConnector;
}

async function render(contract, layout, _blockNum, _masterArtTokenId) {
	blockNum = parseInt(_blockNum);
	masterArtTokenId = parseInt(_masterArtTokenId);

	var currentImage = null;

	for (var i = 0; i < layout.layers.length; i++) {
		console.log((process.memoryUsage().rss / 1024 / 1024) + " MB");

		// TODO sort layers by z_order?
		var layer = layout.layers[i];

		console.log("rendering layer: " + (i + 1) + " of " + layout.layers.length + " (" + layer.id + ")")

		if (KEY_STATES in layer) {
			var uriIndex = await readIntProperty(contract, layer, KEY_STATES, "Layer Index");

			layer = layer[KEY_STATES].options[uriIndex];
		}

		var layerImage = null;

		if (layer.uri === undefined) {
			layerImage = await new Jimp(layer[KEY_WIDTH], layer[KEY_HEIGHT]);
		} else {
			var imageBuffer = await bufferConnector.loadFromURI(layer.uri);	

			layerImage = await Jimp.read(imageBuffer);

			imageBuffer = null;
		}		

		if (currentImage == null) {
			currentImage = layerImage;
		} else {
			currentImage = await renderLayer(contract, currentImage, layout, layer, layerImage);
		}

		layerImage = null;
		layer = null;
		// heapdump.writeSnapshot(Date.now() + '.heapsnapshot');
	}

	return currentImage;
}

async function readIntProperty(contract, object, key, label) {
	var value = object[key];

	// check if value is an object. If so then we need to check the contract value
	if (typeof value === "object") {
		var tokenId = object[key]["token-id"] + masterArtTokenId; // layer token ids are relative to their master token id
		var leverId = object[key]["lever-id"];

		var controlLeverResults = null;

		if (tokenId in controlTokenCache) {
			console.log("	Using control token CACHE. (TokenId=" + tokenId + ", LeverId=" + leverId + ", Label='" + label + "')");

			controlLeverResults = controlTokenCache[tokenId];
		} else {
			console.log("	Fetching from contract. (TokenId=" + tokenId + ", LeverId=" + leverId + ", Label='" + label + "')");

			// retrieve results as of a specific block number (use -1 for latest)
			if (blockNum >= 0) {
				controlLeverResults = await contract.getControlToken(tokenId, {blockTag : blockNum});
			} else {
				controlLeverResults = await contract.getControlToken(tokenId);
			}

			// print out the control lever results
			// for (var z = 0; z < controlLeverResults.length; z++) {
			// 	console.log(controlLeverResults[z].toString());
			// }

			// store in cache for future use
			controlTokenCache[tokenId] = controlLeverResults;
		}

		// controlLeverResults is in format [minValue, maxValue, currentValue, ..., ..., ...]
		// so currentValue for the lever we want will be index 2, 5, 8, 11, etc.
		var currentLeverValue = controlLeverResults[2 + (leverId * 3)];
		
		value = parseInt(currentLeverValue);

		console.log("		" + label + " = " + value);
	} else {
		console.log("	" + label + " = " + value);
	}

	return value;
}

function getLayerWithId(layout, layerId) {
	for (var i = 0; i < layout.layers.length; i++) {
		if (layout.layers[i].id == layerId) {
			return layout.layers[i];
		}
	}
	return null;
}

async function renderLayer(contract, currentImage, layout, layer, layerImage) {
	// if (currentImage !== null) {
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
		if (KEY_FIXED_ROTATION in layer) {
			var rotation = await readIntProperty(contract, layer, KEY_FIXED_ROTATION, "Layer Fixed Rotation");

			layerImage.rotate(rotation, true);

			// adjust for the new width and height based on the rotation
			bitmapWidth = layerImage.bitmap.width;
			bitmapHeight = layerImage.bitmap.height;
		}

		var x = 0;
		var y = 0;

		if (KEY_ANCHOR in layer) {				
			var anchorLayerId = layer[KEY_ANCHOR];

			if (typeof anchorLayerId === "object") {
				// TODO test this
				var anchorLayerIndex = await readIntProperty(contract, layer, KEY_ANCHOR, "Anchor Layer Index");

				anchorLayerId = layer[KEY_ANCHOR].options[anchorLayerIndex];
			}

			var anchorLayor = getLayerWithId(layout, anchorLayerId);
			
			console.log("	Anchor Layer Id: " + anchorLayerId);
			
			x = anchorLayor.finalCenterX;
			y = anchorLayor.finalCenterY;
		}

		var relativeX = 0;
		var relativeY = 0;
		
		// position the layer (optionally)
		if (KEY_FIXED_POSITION in layer) {
			// Fixed position sets an absolute position
			x = await readIntProperty(contract, layer[KEY_FIXED_POSITION], KEY_X, "Layer Fixed Position X");
			y = await readIntProperty(contract, layer[KEY_FIXED_POSITION], KEY_Y, "Layer Fixed Position Y");
		} else {
			// relative position adjusts xy based on the anchor
			if (KEY_RELATIVE_POSITION in layer) {
				relativeX = await readIntProperty(contract, layer[KEY_RELATIVE_POSITION], KEY_X, "Layer Relative Position X");
				relativeY = await readIntProperty(contract, layer[KEY_RELATIVE_POSITION], KEY_Y, "Layer Relative Position Y");
			}

			// relative rotation orbits this layer around an anchor
			if (KEY_ORBIT_ROTATION in layer) {
				var relativeRotation = await readIntProperty(contract, layer, KEY_ORBIT_ROTATION, "Layer Orbit Rotation");

				console.log("Orbiting " + relativeRotation + " degrees around anchor");					

				var rad = -relativeRotation * Math.PI / 180;

				var newRelativeX = Math.round(relativeX * Math.cos(rad) - relativeY * Math.sin(rad));
				var newRelativeY = Math.round(relativeY * Math.cos(rad) + relativeX * Math.sin(rad));

				relativeX = newRelativeX;
				relativeY = newRelativeY;
			}

			x += relativeX;
			y += relativeY;
		}

		// stamp the final center X and Y that this layer was rendered at (for any follow-up layers that might be anchored here)
		layer.finalCenterX = x;
		layer.finalCenterY = y;

		// offset x and y so that layers are drawn at the center of their image
		x -= (bitmapWidth / 2);
		y -= (bitmapHeight / 2);

		// adjust the color
		if (KEY_COLOR in layer) {
			var alpha = await readIntProperty(contract, layer[KEY_COLOR], KEY_ALPHA, "Layer Alpha"); 

			layerImage.opacity(alpha / 100);
		}

		// composite this layer onto the current image
		currentImage.composite(layerImage, x, y);
	} else {
		console.log("	NOT VISIBLE. SKIPPING.")
	}

	return currentImage;
}

exports.render = render;
exports.setBufferConnector = setBufferConnector;