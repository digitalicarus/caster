// TODO: trig function table generation
// TODO: fix texture offsets
// TODO: add translucency
// TODO: add sectors
// TODO: mobile buttons
// TODO: split out caster
// TODO: split out renderer
// TODO: split out var hell into configs
// TODO: convert rendering conditionals to factory replacer functions
// TODO: mobile config
define([
		'shared',
		'wee',
		'keys',
		'touch',
		'level',
		'player'
], function (Shared, Wee, Keys, Touch, Level, Player) {
	var texBuf             = document.createElement('canvas')
	,   texBufCtx          = texBuf.getContext('2d')
	,   buf                = document.createElement('canvas')
	,   bufCtx             = buf.getContext('2d')
	,   textureSrc         = 'img/terrain.png'
	,   twoPI              = Math.PI>>1
	,   unitPow            = 5
	,   unitShift          = unitPow + 1
	,   unit               = 2<<unitPow
	,   playerHeight       = unit>>1
	,   fov                = 64
	,   stripShift         = 1
	,   stripWidth         = 1<<stripShift
	,   fovRad             = (fov * Math.PI) / 180
	,   halfFovRad         = fovRad / 2
	,   frustumWidth       = Shared.canvas.width
	,   frustumHeight      = Shared.canvas.height
	,   rayAngle           = fov * stripWidth / frustumWidth 
	,   rayAngleRad        = (rayAngle * Math.PI) / 180
	,   frustumCenter      = { x: frustumWidth>>1, y: frustumHeight>>1 }
	,   frustumDistance    = (frustumWidth>>1) / Math.tan(fov/2)
	,   defaultStripFactor = unit * frustumDistance
	,   player             = null
	,   sky                = Shared.ctx.createLinearGradient(0, 0, 0, Shared.canvas.height >> 1)
	,   floor              = Shared.ctx.createLinearGradient(0, Shared.canvas.height >> 1, 0, Shared.canvas.height)
	,   mobileCtrlSize     = (Shared.canvas.width / 6) >> 0
	,   lighting           = true
    ,  	lightFactor        = unit << 7
    ,   canvasMiddle       = Shared.canvas.height / 2
	,   texture            = true
	;

	sky.addColorStop(0, "rgb(90, 90, 200)");
	sky.addColorStop(1, "rgb(255, 255, 255)");
	floor.addColorStop(0, "rgb(50, 0, 0)");
	floor.addColorStop(1, "rgb(0, 0, 0)");


	Shared.setVendorProps('imageSmoothingEnabled', false);

	player = new Player({
		x: Level.current.player.x<<unitShift + (unit>>1),
		y: Level.current.player.y<<unitShift + (unit>>1),
		angle: Level.current.player.angle || 0.14
	});

	document.body.appendChild(buf);
	document.body.appendChild(texBuf);
	buf.height = Shared.canvas.height <<1 ;

	Keys.on('w', function () {
		player.forward();
	});
	Keys.on('a', function () {
		player.left();
	});
	Keys.on('s', function () {
		player.back();
	});
	Keys.on('d', function () {
		player.right();
	});
	Keys.on('q', function () {
		player.strafeLeft();
	});
	Keys.on('e', function () {
		player.strafeRight();
	});

	Keys.on('l', function () {
		lighting = (lighting) ? false : true;
	});
	Keys.on('t', function () {
		texture = (texture) ? false : true;
	});


	if(Shared.isMobile) {
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9668;',
			size: mobileCtrlSize,
			left: 5,
			bottom: mobileCtrlSize/1.2
		}, function () {
			player.strafeLeft();
		}));
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9658;',
			size: mobileCtrlSize,
			left: mobileCtrlSize/.7,
			bottom: mobileCtrlSize/1.2
		}, function () {
			player.strafeRight();
		})); 
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9650;',
			size: mobileCtrlSize,
			left: mobileCtrlSize/1.3,
			bottom: mobileCtrlSize + mobileCtrlSize/2.5
		}, function () {
			player.forward();
		}));
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9660;',
			size: mobileCtrlSize,
			left: mobileCtrlSize/1.3,
			bottom: 5
		}, function () {
			player.back();
		}));
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9668;',
			size: mobileCtrlSize,
			right: mobileCtrlSize/.7,
			bottom: mobileCtrlSize>>1
		}, function () {
			player.left();
		}));
		Shared.controlsEle.appendChild(Touch.button({
			symbol: '&#9658;',
			size: mobileCtrlSize,
			right: mobileCtrlSize>>2,
			bottom: mobileCtrlSize>>1
		}, function () {
			player.right();
		})); 	
	}
 

	/**
	 * returns tile data at location
	 */
	function tileAt(x, y) {
		try {
			return Level.current.map[y >> unitShift][x >> unitShift];
		} catch (e) {
			return undefined;
		}
	}


	function blitScale (tex, tX, tY, tW, tH, dst, dX, dY, dW, dH, filter) {
		// when doing this for reals this would be part of a module and 
		// would encapsulate the buffer canvas element
		var scaleX = dW/tW
		,   scaleY = dH/tH
		,   blitW  = (scaleX < 1) ? dW : tW
		,   blitH  = (scaleY < 1) ? dH : tH
		,   destW  = (scaleX < 1) ? dW : dW * scaleX 
		,   destH  = (scaleY < 1) ? dH : dH * scaleY 
		,   ctxDst = dst.getContext('2d')
		,   ctxTex = tex.getContext('2d')
		,   ctxBuf = bufCtx
		,   i      = 0
		,   j      = 0
		,   data   = null
		,   ptr    = 0
		;
		
		// if one scale is < 1 then we have to blit that scale to buf canvas
		// to avoid cutting off the texture
		ctxBuf.drawImage(tex,tX,tY,tW,tH,0,0,blitW,blitH);

		filter 
		&& typeof filter === 'function' 
		&& ctxBuf.putImageData(
				filter(
					ctxBuf.getImageData(0,0,blitW,blitH),blitW,blitH
				),0,0
		);
		
		ctxDst.drawImage(buf,0,0,dW,dH,dX,dY,dW*scaleX,dH*((scaleY < 1) ? 1 : scaleY));
	}

	// http://www.permadi.com/tutorial/raycast/rayc7.html
	function cast() {
		var i           = 0
		,   currRay     = player.angle + halfFovRad
		,   fishCorrect = null
		,   tanRay      = null                               // used during cast
		,   tanRayInv   = null                               // used during cast
		,   sinRay      = null
		,   sinRayInv   = null
		,   cosRay      = null
		,   cosRayInv   = null
		,   horizYIncr  = null
		,   vertXIncr   = null
		,   horizXIncr  = null                               // determined during cast
		,   vertYIncr   = null                               // determined during cast
		,   normalizedY = player.y >> unitShift << unitShift // find grid location
		,   normalizedX = player.x >> unitShift << unitShift // ""
		,   horizStartY = null
		,   vertStartX  = null
		,   castY       = null
		,   castX       = null
		,   horizHit    = null  // point
		,   vertHit     = null  // point
		,   horizDist   = null
		,   vertDist    = null
		,   rays        = []
		,   rayObj      = {}
		;
        
        for (i = 0; i < frustumWidth; i += stripWidth) {
        	rayObj = {};
            tanRay = Math.tan(currRay);
            tanRayInv = 1/tanRay; // reciprocal mult is faster than divide in some browsers
            sinRay = Math.sin(currRay);
            cosRay = Math.cos(currRay);
            vertHit = null;
            horizHit = null;
            fishCorrect = Math.cos(player.angle - currRay);

			horizYIncr  = (sinRay > 0) ? -unit : unit; // casting up - negative Y 
			vertXIncr   = (cosRay > 0) ? unit : -unit;  // castingright - positive X
			horizStartY = (horizYIncr < 0) ? normalizedY - 1 : normalizedY + unit; // pull point into grid block
			vertStartX  = (vertXIncr < 0) ? normalizedX - 1 : normalizedX + unit;   // ""

        	// get first horizontal intercept
        	castY = horizStartY;
        	castX = player.x + (player.y - castY) * tanRayInv; // chance to divide by 0 FIXME

        	if (tileAt(castX, castY) > 0) { 
        		horizHit = { x: castX, y: castY };
			} else {
				horizXIncr = (horizYIncr < 0) ? unit * tanRayInv : -unit * tanRayInv;

				// cast for horizontal intercepts or edge of level
				while (castY > 0 && castX > 0 
						&& castY >> unitShift < Level.current.map.length 
						&& castX >> unitShift < Level.current.map[0].length 
						&& !horizHit) {
					castY += horizYIncr;
					castX += horizXIncr;
					if (tileAt(castX, castY) > 0) {
						horizHit = { x: castX, y: castY }
						break;
					}
				}
				if(!horizHit) {
					horizHit = { x: castX, y: castY }
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//horizDist = (horizHit) ? Math.abs(-player.x + horizHit.x / cosRay) : Infinity; // chance to divide by 0 FIXME
			horizDist = (horizHit) ? Math.sqrt(Math.pow(player.x - horizHit.x, 2) + Math.pow(player.y - horizHit.y, 2)) : Infinity; // chance to divide by 0 FIXME

			// get first vertical intercept
			castX = vertStartX;
			castY = player.y + (player.x - castX) * tanRay;

			if (tileAt(castX, castY) > 0) {
				vertHit = { x: castX, y: castY };
			} else {
				vertYIncr = (vertXIncr < 0) ? unit * tanRay : -unit * tanRay;

				// check vertical intercepts
				while ( castX > 0 && castY > 0
						&& castY >> unitShift < Level.current.map.length 
						&& castX >> unitShift < Level.current.map[0].length 
						&& !vertHit) {
					castX += vertXIncr;
					castY += vertYIncr;
					if (tileAt(castX, castY) > 0) {
						vertHit = { x: castX, y: castY };
					}
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//vertDist = (vertHit) ? Math.abs(-player.x + vertHit.x / cosRay) : Infinity;
			vertDist = (vertHit) ? Math.sqrt(Math.pow(player.x - vertHit.x, 2) + Math.pow(player.y - vertHit.y, 2)) : Infinity; // chance to divide by 0 FIXME
			
			//rayObj = (vertDist < horizDist) ? vertDist : horizDist;

			//vertHit.angle = currRay;
			//horizHit.angle = currRay;
			rayObj = (vertDist < horizDist) ? vertHit : horizHit;
			//rayObj = Shared.aug({},vertHit);
			//rayObj = currRay;
			if(rayObj) {
				rayObj.dist = (vertDist < horizDist) ? vertDist * fishCorrect : horizDist * fishCorrect;
				rayObj.angle = currRay;
				rayObj.tile = tileAt(rayObj.x, rayObj.y)
				rayObj.dir = (vertDist < horizDist) ? "vert" : "horiz";
				rayObj.vert = (vertHit) ? vertHit : null;
				rayObj.horiz = (horizHit) ? horizHit : null;
				rayObj.horizDist = horizDist;
				rayObj.vertDist = vertDist;
			} else {
				rayObj = {
					x: player.x,
					y: player.y,
					angle: currRay
				};
			}

			rays.push(rayObj);

        	currRay -= rayAngleRad;
		}

		return rays;
	}

	// TODO: make minimap that draws only a configurable portion of the map around the player as center point
	function draw2d (rays, player, scale) {
		var i
		,   j
		,   playerDotScale = unit >> 3
		;
		Shared.ctx.save();
		Shared.ctx.scale(scale, scale);
		Shared.ctx.strokeStyle = "white";
		Shared.ctx.fillStyle   = "#b0b0ff";
		Shared.ctx.lineWidth = 1/scale;


		for ( i = 0; i < Level.current.map.length; i++ ) {
			for ( j = 0; j < Level.current.map[i].length; j++ ) {
				if ( Level.current.map[i][j] > 0 ) {
					Shared.ctx.strokeRect(j<<unitShift, i<<unitShift, unit, unit);
					Shared.ctx.fillRect(j<<unitShift, i<<unitShift, unit, unit);
				}
			}
		}

		Shared.ctx.fillStyle = "red";
		Shared.ctx.lineWidth = 5;
		Shared.ctx.fillRect(player.x, player.y, unit>>3, unit>>3);
		Shared.ctx.beginPath();
		Shared.ctx.moveTo(player.x, player.y);
		//Shared.ctx.lineTo(player.x + 80 * Math.cos(player.angle), player.y + 80 * -Math.sin(player.angle));
		Shared.ctx.stroke();
		Shared.ctx.closePath();

		Shared.ctx.strokeStyle = "yellow";
		Shared.ctx.lineWidth = .5;
		for ( i = 0; i < rays.length; i++ ) {
			if(!rays[i] || typeof rays[i] !== 'object') { continue; }
			Shared.ctx.beginPath();
			Shared.ctx.moveTo(player.x + playerDotScale * .5, player.y + playerDotScale * .5);
			Shared.ctx.lineTo(rays[i].x, rays[i].y);
			// DEBUG: vision cone
			//Shared.ctx.lineTo(player.x + rays[i].dist * Math.cos(rays[i].angle), player.y + rays[i].dist * -Math.sin(rays[i].angle));
			Shared.ctx.stroke();
			Shared.ctx.closePath();
		}
		Shared.ctx.restore();
	}

	function draw3d(rays, player, scale) {
		var i            = 0
		,   stripHeight  = 0
		,   texStripLoc  = 0
		,   ray          = null
		;

		Shared.ctx.save();
		Shared.ctx.strokeStyle = "blue";
		Shared.ctx.lineWidth = stripWidth;
		for ( i = 0; i < rays.length; i++ ) {
			ray = rays[i];
			stripHeight = defaultStripFactor / ray.dist;

			/*
			 * Textureless

			*/

			// Texture this mutha
			/*

			*/
			if(lighting) {
				blitScale(
					texBuf,
					((ray.tile << unitShift) + ((ray.dir === "vert") ? ray.y % unit : ray.x % unit)),
					0,
					1,
					unit,
					Shared.canvas,
					i<<stripShift,
					canvasMiddle - stripHeight / 2,
					stripWidth,
					stripHeight,
					function (data) {
						var i = 0
						,   light = (lightFactor) / (ray.dist * (ray.dist>>1))
						;
							
						while(i<data.data.length) {
							while(i%4!==3) {
								data.data[i++] *= light;
							}
							i++;
						}
						return data;
					}
				);
			} else if (texture) {
				Shared.ctx.drawImage(
						Shared.assets[textureSrc],
						((ray.tile << unitShift) + ((ray.dir === "vert") ? ray.y % unit : ray.x % unit)),
						//(((ray.tile << unitShift) + ((ray.dir === "vert") ? ray.y % unit : ray.x % unit))>>0) - (stripWidth>>1),
						0,
						//stripWidth, //try sampling the whole strip width - then we'll try scaling 1px to width
						1,
						unit,
						i<<stripShift,
						canvasMiddle - stripHeight / 2,
						stripWidth,
						stripHeight
				);
			} else {
				Shared.ctx.lineWidth = stripWidth;
				Shared.ctx.beginPath();
				Shared.ctx.moveTo(i<<stripShift, canvasMiddle - stripHeight / 2);
				Shared.ctx.lineTo(i<<stripShift, canvasMiddle + stripHeight / 2);
				Shared.ctx.stroke();
				Shared.ctx.closePath(); 			
			}
		}
		Shared.ctx.restore();
	}

	var renderScanlines = (function (mobile) {
		if (mobile) {
			return function () {};
		} else {
			return function () {
				var i    = 0
				,   incr = 2
				;

				Shared.ctx.save();
				Shared.ctx.strokeStyle = "#222";
				Shared.ctx.lineWidth =  .4;
				for (i=1.1; i < Shared.canvas.height; i+=incr) {
					Shared.ctx.beginPath();
					Shared.ctx.moveTo(0, i);
					Shared.ctx.lineTo(Shared.canvas.width, i);
					Shared.ctx.stroke();
					Shared.ctx.closePath();
				} 
				Shared.ctx.restore();
			}
		}
	})(Shared.isMobile);

	Wee.setRender(function () {
		Keys.run();
		Touch.run();
		var rays = cast()
		,   i    = 0
		,   scanIncr = 2
		;

		Shared.ctx.save();
		Shared.ctx.clearRect(0,0, Shared.canvas.width, Shared.canvas.height); 
		Shared.ctx.fillStyle = sky;
		Shared.ctx.fillRect(0, 0, Shared.canvas.width, Shared.canvas.height >> 1);
		Shared.ctx.fillStyle = floor;
		Shared.ctx.fillRect(0, Shared.canvas.height>>1, Shared.canvas.width, Shared.canvas.height);

		draw3d(rays, player, 1);
		if(!Shared.isMobile) {
			draw2d(rays, player, .1);
		}

		// scanline effect
		//renderScanlines();
		Shared.ctx.restore();
	});
   
	Shared.loadAssets([textureSrc], function () {
		texBufCtx.drawImage(Shared.assets[textureSrc], 0, 0);
		Wee.start();
	});
});
