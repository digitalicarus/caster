/*global define,console*/
define(['config',
		'class',
		'aug'
], function(config, Class, aug) {
	"use strict";

	// TODO arrange code so jshint doesn't complain that this is below the var defs below
	function checkMobile () {
		//(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
		return document.body.hasOwnProperty('ontouchstart');
	}

	var doc           = document
	,   body          = doc.body
	,   createEle     = function(ele) { return doc.createElement(ele); }
	,   getById       = function(id)  { return doc.getElementById(id); }
	,   gameContainer = createEle('main')
	,   controlsEle   = createEle('aside')
	,   canvas        = createEle('canvas')
	,   ctx           = canvas.getContext('2d')
	,   isMobile      = checkMobile()
	,   mobileScale   = 0.5
	,   canvasWidth   = (!isMobile) ? config.width : (config.width * mobileScale)|0
	,   canvasHeight  = (!isMobile) ? config.height : (config.height * mobileScale)|0
	,   stripShift    = (!isMobile) ? 1 : 1
	,   texShift      = (!isMobile) ? 6 : 5
	,   texScale      = (!isMobile) ? 1 : 0.5
	,   assetType = {
			img: ['png','gif','jpeg',],
			audio: ['ogg', 'mp3', 'wav']
		}
	,   vendors       = ['', 'webkit', 'moz', 'ms', 'o']
	,   globalAssets  = {}
	,   map           = null // defined below
	,   i             = 0
	;

	canvas.width = canvasWidth;
	gameContainer.style.width = canvasWidth + 'px';
	controlsEle.style.width = canvasWidth + 'px';
	canvas.height = canvasHeight;
	gameContainer.style.height = canvasHeight + 'px';
	controlsEle.style.height = canvasHeight + 'px';
	canvas.style.backgroundColor = config.canvasBgColor;

	gameContainer.style.position = "absolute";
	canvas.style.position = "absolute";
	controlsEle.style.position = "absolute";
	gameContainer.appendChild(canvas);
	gameContainer.appendChild(controlsEle);
	body.appendChild(gameContainer);

	function setVendorProps (prop, value) {
		var caps = prop.charAt(0).toUpperCase() + prop.slice(1)
		,   tmp  = ''
		;

		for ( i=0; i < vendors.length; i++ ) {
			tmp = i + ((i==='') ? prop : caps);
			if (ctx.hasOwnProperty(tmp)) {
				ctx[tmp] = value;
			}
		}
	}

	function resize (evt) {
		var height = window.innerHeight || body.clientHeight
		,   width  = window.innerWidth || body.clientWidth
		,   wide   = (width / height > canvas.width / canvas.height)
		,   scale  = (wide) ? height / canvas.height : width / canvas.width
		,   styles = ['mozTransform', 'transform', 'webkitTransform', 'OTransform', 'msTransform']
		,   i      = null
		;

		for(i in styles) {
			gameContainer.style[styles[i]] = 'scale3d('+scale+', '+scale+', 1)';
		}

		gameContainer.style.top  = (canvas.height * (scale-1)>>1) + 'px';
		gameContainer.style.left = (canvas.width * (scale-1)>>1) + ((width - canvas.width * scale)>>1) + 'px';
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
		,   i        = 0
		,   j        = null
		;
	
		function immaLetYouFinish() {
			//console.log("{total: "+total+", yays: "+yays+", nays: "+nays+"}");
			if(total > yays+nays) {
				//console.log("imma let you finish");
				return;
			}
			cb && cb();
		}

		function loadHandler (e) {
			var target = e.target || e.currentTarget || e.srcElement;
			yays++;
			console.log(target.src+" loaded");
			target.assetLoaded = true;
			immaLetYouFinish();
		}

		function errorHandler (e) {
			var target = e.target || e.currentTarget || e.srcElement;
			nays++;
			console.log(target.src+" did NOT load");
			target.assetLoaded = false;
			immaLetYouFinish();
		}
		
		for(i=0; i<assets.length; i++) {
			for(j in assetType) {
				if(assetType[j].indexOf(assets[i].replace(/.*\./,'').toLowerCase()) >= 0) {
					assetEle              = document.createElement(j);
					assetEle.assetType    = j;
					globalAssets[assets[i]] = assetEle;
					
					assetEle.addEventListener("load", loadHandler, false);
					assetEle.addEventListener("error", errorHandler, false);
				
					assetEle.src = assets[i];
				}
			}
		}
	}


	//POLYFILLS!
	// @jed: https://gist.github.com/jed/1031568
	map = [].map||(Array.prototype.map=function(a){for(var b=this,c=b.length,d=[],e=0,f;e<b;){d[e]=e in b?a.call(arguments[1],b[e],e++,b):f;}return d;});


	return {
		container: gameContainer,
		controlsEle: controlsEle,
		canvas: canvas,
		ctx:    ctx,
		isMobile: isMobile,
		setVendorProps: setVendorProps,
		config: config,
		Class:  Class,
		aug: aug,
		degToRad: degToRad,
		radToDeg: radToDeg,
		loadAssets: loadAssets,
		stripShift: stripShift,
		texShift: texShift,
		texScale: texScale,
		halfPI: Math.PI / 2,
		twoPI: 2*Math.PI,
		threePI: 3*Math.PI,
		assets: globalAssets,
		map: map
	};

});
