define(['config', 
		'class',
		'aug'
], function(config, Class, aug) {
	var doc           = document
	,   body          = doc.body
	,   createEle     = function(ele) { return doc.createElement(ele) }
	,   getById       = function(id)  { return doc.getElementById(id) }
	,   canvas        = createEle('canvas')
	,   ctx           = canvas.getContext('2d')
	,   canvasWidth   = config.width
	,   canvasHeight  = config.height
	;

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	canvas.style.position = "absolute";
	canvas.style.backgroundColor = config.canvasBgColor;

	body.appendChild(canvas);

	function resize (evt) {
		var height = window.innerHeight || body.clientHeight
		,   width  = window.innerWidth || body.clientWidth
		,   wide   = (width / height > canvas.width / canvas.height)
		,   scale  = (wide) ? height / canvas.height : width / canvas.width
		,   styles = ['mozTransform', 'transform', 'webkitTransform', 'OTransform', 'msTransform']
		,   i      = null
		;

		for(i in styles) {
			canvas.style[styles[i]] = 'scale('+scale+')';
		}

		canvas.style.top  = (canvas.height * (scale-1)>>1) + 'px'; 
		canvas.style.left = (canvas.width * (scale-1)>>1) + ((width - canvas.width * scale)>>1) + 'px';
	}

	function degToRad(deg) {
		return (deg * Math.PI) / 180;
	}

	function radToDeg(rad) {
		return (rad * 180) / Math.PI;
	}

	window.addEventListener('resize', resize, false);
	resize();


	return {
		canvas: canvas,
		ctx:    ctx,
		config: config,
		Class:  Class,
		aug: aug,
		degToRad: degToRad,
		radToDeg: radToDeg,
		twoPI: 2*Math.PI,
		threePI: 3*Math.PI
	};

});
