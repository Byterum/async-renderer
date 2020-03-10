//var heapdump = require('heapdump');
var Jimp = require('jimp');
var ethers = require("ethers");

const KEY_FIXED_ROTATION = "fixed-rotation";
const KEY_ORBIT_ROTATION = "orbit-rotation";
const KEY_ANCHOR = "anchor";
const KEY_SCALE = "scale";

const KEY_COLOR = "color";
const KEY_ALPHA = "alpha";
const KEY_HUE = "hue";

const KEY_RED = "red";
const KEY_GREEN = "green";
const KEY_BLUE = "blue";

const KEY_FIXED_POSITION = "fixed-position";
const KEY_RELATIVE_POSITION = "relative-position";
const KEY_X = "x";
const KEY_Y = "y";
const KEY_VISIBLE = "visible";
const KEY_URI = "uri";
const KEY_STATES = "states";
const KEY_WIDTH = "width";
const KEY_HEIGHT = "height";
const KEY_MIRROR = "mirror";

var blockNum = -1;
var bufferConnector = null;

var controlTokenCache = {}

function setBufferConnector(_bufferConnector) {
	bufferConnector = _bufferConnector;
}

async function render(contract, layout, _blockNum, masterArtTokenId) {
	blockNum = parseInt(_blockNum);
	masterArtTokenId = parseInt(masterArtTokenId);

	var currentImage = null;

	controlTokenCache = {}; // clear the cache before each render

	for (var i = 0; i < layout.layers.length; i++) {
		console.log((process.memoryUsage().rss / 1024 / 1024) + " MB");

		// TODO sort layers by z_order?
		var layer = layout.layers[i];

		console.log("rendering layer: " + (i + 1) + " of " + layout.layers.length + " (" + layer.id + ")")

		if (KEY_STATES in layer) {
			var uriIndex = await readIntProperty(contract, layer, KEY_STATES, "Layer Index", masterArtTokenId);

			layer = layer[KEY_STATES].options[uriIndex];
		}

		// check if this layer has visbility controls
		if (KEY_VISIBLE in layer) {
			var isVisible = (await readIntProperty(contract, layer, KEY_VISIBLE, "Layer Visible", masterArtTokenId)) === 1;
			if (isVisible === false) {
				console.log("	NOT VISIBLE. SKIPPING.")
				continue;
			}
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
			currentImage = await renderLayer(contract, currentImage, layout, layer, layerImage, masterArtTokenId);
		}

		layerImage = null;
		layer = null;
		// heapdump.writeSnapshot(Date.now() + '.heapsnapshot');
	}

	return currentImage;
}

async function readIntProperty(contract, object, key, label, masterArtTokenId) {
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
			var results = "		";
			for (var z = 0; z < controlLeverResults.length; z++) {
				results += controlLeverResults[z].toString();
				results += ", ";
			}
			results += " (TokenId=" + tokenId + ", LeverId=" + leverId + ")";
			console.log(results);

			// store in cache for future use
			controlTokenCache[tokenId] = controlLeverResults;
		}

		// controlLeverResults is in format [minValue, maxValue, currentValue, ..., ..., ...]
		// so currentValue for the lever we want will be index 2, 5, 8, 11, etc.
		var currentLeverValue = controlLeverResults[2 + (leverId * 3)];
		
		value = parseInt(currentLeverValue);

		console.log("		" + label + " = " + value + " (TokenId=" + tokenId + ", LeverId=" + leverId + ")");
	} else {
		console.log("	" + label + " = " + value);
	}

	return value;
}

function getLayerWithId(layout, layerId) {
	for (var i = 0; i < layout.layers.length; i++) {
		if (layout.layers[i].id == layerId) {
			if (KEY_STATES in layout.layers[i]) {
				for (var k = 0; k < layout.layers[i][KEY_STATES].options.length; k++) {
					var layer = layout.layers[i][KEY_STATES].options[k];
					if (layer.active) {
						return layer;
					}
				}
			} else {
				return layout.layers[i];
			}
		}
	}
	return null;
}

async function renderLayer(contract, currentImage, layout, layer, layerImage, masterArtTokenId) {
	// scale the layer (optionally)
	var bitmapWidth = layerImage.bitmap.width;
	var bitmapHeight = layerImage.bitmap.height;

	if (KEY_SCALE in layer) {
		var scale_x = (await readIntProperty(contract, layer[KEY_SCALE], KEY_X, "Layer Scale X", masterArtTokenId)) / 100;
		var scale_y = (await readIntProperty(contract, layer[KEY_SCALE], KEY_Y, "Layer Scale Y", masterArtTokenId)) / 100;

		if ((scale_x == 0) || (scale_y == 0)) {
			console.log("	Scale X or Y is 0 -- returning currentImage.")
			return currentImage;
		}
		// determine the new width
		bitmapWidth = layerImage.bitmap.width * scale_x;
		bitmapHeight = layerImage.bitmap.height * scale_y;
		// resize the image
		layerImage.resize(bitmapWidth, bitmapHeight);
	}

	// rotate the layer (optionally)
	if (KEY_FIXED_ROTATION in layer) {
		var rotation = await readIntProperty(contract, layer, KEY_FIXED_ROTATION, "Layer Fixed Rotation", masterArtTokenId);

		layerImage.rotate(rotation, true);

		// adjust for the new width and height based on the rotation
		bitmapWidth = layerImage.bitmap.width;
		bitmapHeight = layerImage.bitmap.height;
	}

	// check for mirror
	if (KEY_MIRROR in layer) {
		var shouldMirrorHorizontal = ((await readIntProperty(contract, layer[KEY_MIRROR], KEY_X, "Mirror X", masterArtTokenId)) == 1);
		var shouldMirrorVertical = ((await readIntProperty(contract, layer[KEY_MIRROR], KEY_Y, "Mirror Y", masterArtTokenId)) == 1);

		layerImage.mirror(shouldMirrorHorizontal, shouldMirrorVertical);
	}

	var x = 0;
	var y = 0;

	if (KEY_ANCHOR in layer) {				
		var anchorLayerId = layer[KEY_ANCHOR];

		if (typeof anchorLayerId === "object") {
			// TODO test this
			var anchorLayerIndex = await readIntProperty(contract, layer, KEY_ANCHOR, "Anchor Layer Index", masterArtTokenId);

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
		x = await readIntProperty(contract, layer[KEY_FIXED_POSITION], KEY_X, "Layer Fixed Position X", masterArtTokenId);
		y = await readIntProperty(contract, layer[KEY_FIXED_POSITION], KEY_Y, "Layer Fixed Position Y", masterArtTokenId);
	} else {
		// relative position adjusts xy based on the anchor
		if (KEY_RELATIVE_POSITION in layer) {
			relativeX = await readIntProperty(contract, layer[KEY_RELATIVE_POSITION], KEY_X, "Layer Relative Position X", masterArtTokenId);
			relativeY = await readIntProperty(contract, layer[KEY_RELATIVE_POSITION], KEY_Y, "Layer Relative Position Y", masterArtTokenId);
		}

		// relative rotation orbits this layer around an anchor
		if (KEY_ORBIT_ROTATION in layer) {
			var relativeRotation = await readIntProperty(contract, layer, KEY_ORBIT_ROTATION, "Layer Orbit Rotation", masterArtTokenId);

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
	layer.active = true; // set this to be true so that any subsequent layers that are anchored to this can tell which layer was active (for multi state layers)

	// offset x and y so that layers are drawn at the center of their image
	x -= (bitmapWidth / 2);
	y -= (bitmapHeight / 2);

	// adjust the color
	if (KEY_COLOR in layer) {
		if (KEY_RED in layer[KEY_COLOR]) {
			var red = await readIntProperty(contract, layer[KEY_COLOR], KEY_RED, "Layer Color Red", masterArtTokenId); 

			layerImage.color([
				{
					apply: 'red', params: [red]
				}
			]);
		}
		if (KEY_GREEN in layer[KEY_COLOR]) {
			var green = await readIntProperty(contract, layer[KEY_COLOR], KEY_GREEN, "Layer Color Green", masterArtTokenId); 

			layerImage.color([
				{
					apply: 'green', params: [green]
				}
			]);
		}
		if (KEY_BLUE in layer[KEY_COLOR]) {
			var blue = await readIntProperty(contract, layer[KEY_COLOR], KEY_BLUE, "Layer Color Blue", masterArtTokenId); 

			layerImage.color([
				{
					apply: 'blue', params: [blue]
				}
			]);
		}
		if (KEY_HUE in layer[KEY_COLOR]) {
			var hue = await readIntProperty(contract, layer[KEY_COLOR], KEY_HUE, "Layer Color Hue", masterArtTokenId); 

			layerImage.color([
				{
					apply: 'hue', params: [hue]
				}
			]);
		}
		if (KEY_ALPHA in layer[KEY_COLOR]) {
			var alpha = await readIntProperty(contract, layer[KEY_COLOR], KEY_ALPHA, "Layer Color Alpha", masterArtTokenId); 

			layerImage.opacity(alpha / 100);
		}
	}

	// composite this layer onto the current image
	currentImage.composite(layerImage, x, y);

	return currentImage;
}

exports.render = render;
exports.setBufferConnector = setBufferConnector;