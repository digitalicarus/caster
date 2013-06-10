// TODO: trig function table generation
// TODO: add strip width configuration ability (degrade visuals - less rays more perf)
define([
		'shared',
		'wee',
		'keys',
		'level',
		'player'
], function (Shared, Wee, Keys, Level, Player) {
	var twoPI             = Math.PI>>1
	,   unitPow            = 5
	,   unitShift          = unitPow + 1
	,   unit               = 2<<unitPow
	,   playerHeight       = unit>>1
	,   fov                = 64
	,   fovRad             = (fov * Math.PI) / 180
	,   halfFovRad         = fovRad / 2
	,   frustumWidth       = Shared.canvas.width
	,   frustumHeight      = Shared.canvas.height
	,   rayAngle           = fov / frustumWidth
	,   rayAngleRad        = (rayAngle * Math.PI) / 180
	,   frustumCenter      = { x: frustumWidth>>1, y: frustumHeight>>1 }
	,   frustumDistance    = (frustumWidth>>1) / Math.tan(fov/2)
	,   defaultStripFactor = unit * frustumDistance
	,   player             = null
	;


	player = new Player({
		x: Level.current.player.x<<unitShift + (unit>>1),
		y: Level.current.player.y<<unitShift + (unit>>1),
		angle: Level.current.player.angle || 0.14
	});


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
		,   dist        = []
		;
        
        for (i = 0; i < frustumWidth; i ++) {
            tanRay = Math.tan(currRay);
            tanRayInv = 1/tanRay; // reciprocal mult is faster than divide in some browsers
            sinRay = Math.sin(currRay);
            cosRay = Math.cos(currRay);
            vertHit = null;
            horizHit = null;
            fishCorrect = Math.cos(player.angle - currRay);
            //fishCorrect = 1;

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
			
			//dist[i] = (vertDist < horizDist) ? vertDist : horizDist;

			//vertHit.angle = currRay;
			//horizHit.angle = currRay;
			dist[i] = (vertDist < horizDist) ? vertHit : horizHit;
			//dist[i] = Shared.aug({},vertHit);
			//dist[i] = currRay;
			if(dist[i]) {
				dist[i].dist = (vertDist < horizDist) ? vertDist * fishCorrect : horizDist * fishCorrect;
				dist[i].angle = currRay;
				dist[i].dir = (vertDist < horizDist) ? "vert" : "horiz";
				dist[i].vert = (vertHit) ? vertHit : null;
				dist[i].horiz = (horizHit) ? horizHit : null;
				dist[i].horizDist = horizDist;
				dist[i].vertDist = vertDist;
			} else {
				dist[i] = {
					x: player.x,
					y: player.y,
					angle: currRay
				};
			}


        	currRay -= rayAngleRad;
		}

		return dist;
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
			//Shared.ctx.lineTo(rays[i].x, rays[i].y);
			// DEBUG: vision cone
			Shared.ctx.lineTo(player.x + rays[i].dist * Math.cos(rays[i].angle), player.y + rays[i].dist * -Math.sin(rays[i].angle));
			Shared.ctx.stroke();
			Shared.ctx.closePath();
		}
		Shared.ctx.restore();
	}

	function draw3d(rays, player, scale) {
		var i            = 0
		,   stripHeight  = 0
		,   canvasMiddle = Shared.canvas.height / 2
		;

		Shared.ctx.save();
		Shared.ctx.strokeStyle = "blue";
		Shared.ctx.lineWidth = 1;
		for ( i = 0; i < rays.length; i++ ) {
			stripHeight = defaultStripFactor / rays[i].dist;
			Shared.ctx.beginPath();
			Shared.ctx.moveTo(i, canvasMiddle - stripHeight / 2);
			Shared.ctx.lineTo(i, canvasMiddle + stripHeight / 2);
			Shared.ctx.stroke();
			Shared.ctx.closePath();
		}
		Shared.ctx.restore();
	}

	Wee.setUpdate(function () {
		Keys.run();
		var rays = cast();

		Shared.ctx.clearRect(0,0, Shared.canvas.width, Shared.canvas.height); 
		draw3d(rays, player, 1);
    	//draw2d(rays, player, .1);
	});
	document.body.addEventListener('blur', function () {
		Wee.pause();
	});
	document.body.addEventListener('focus', function () {
		Wee.start();
	});
	Wee.start();
});
