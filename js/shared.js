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
	,   assetType = {
			img: ['png','gif','jpeg',],
			audio: ['ogg', 'mp3', 'wav']
		}
	,   globalAssets = []
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

	window.addEventListener('resize', resize, false);
	resize();

	function degToRad(deg) {
		return (deg * Math.PI) / 180;
	}

	function radToDeg(rad) {
		return (rad * 180) / Math.PI;
	}

    function loadAssets (assets, cb) {
		var assetEle = null // ( . )( . )
		,   total    = assets.length
		,   yays     = 0
		,   nays     = 0
		;
	
		function immaLetYouFinish() {
			//console.log("{total: "+total+", yays: "+yays+", nays: "+nays+"}");
			if(total > yays+nays) {
				//console.log("imma let you finish");
				return;
			}
			cb && cb();
		}
		
		for(i=0; i<assets.length; i++) {
			for(j in assetType) {
				if(assetType[j].indexOf(assets[i].replace(/.*\./,'').toLowerCase()) >= 0) {
				assetEle              = document.createElement(j);
				assetEle.assetType    = j;
				globalAssets[assets[i]] = assetEle;
				
				assetEle.addEventListener("load", function(){
					yays++;
					console.log(this.src+" loaded");
					this.assetLoaded = true;
					immaLetYouFinish();
				}, false);
				assetEle.addEventListener("error", function() {
					nays++;
					console.log(this.src+" did NOT load");
					this.assetLoaded = false;
					immaLetYouFinish();
				}, false);
				
				assetEle.src = assets[i];
				}
			}
		}
	}

	return {
		canvas: canvas,
		ctx:    ctx,
		config: config,
		Class:  Class,
		aug: aug,
		degToRad: degToRad,
		radToDeg: radToDeg,
		loadAssets: loadAssets,
		twoPI: 2*Math.PI,
		threePI: 3*Math.PI
	};

});
