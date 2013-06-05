// TODO: trig function table generation
define([
		'shared',
		'wee',
		'keys',
		'level',
		'player'
], function (Shared, Wee, Keys, Level, Player) {
	var twoPI           = Math.PI>>1
	,   unitPow         = 5
	,   unitShift       = unitPow + 1
	,   unit            = 2<<unitPow
	,   playerHeight    = unit>>1
	,   fov             = 90
	,   fovRad          = (fov * Math.PI) / 180
	,   halfFovRad      = fovRad>>1
	,   frustumWidth    = Shared.canvas.width
	,   frustumHeight   = Shared.canvas.height
	,   rayAngle        = fov / frustumWidth
	,   rayAngleRad     = (rayAngle * Math.PI) / 180
	,   frustumCenter   = { x: frustumWidth>>1, y: frustumHeight>>1 }
	,   frustumDistance = (frustumWidth>>1) / Math.tan(fovRad>>1)
	,   player          = null
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
		,   currRay     = player.angle - halfFovRad
		,   tanRay      = null                               // used during cast
		,   sinRay      = null
		,   cosRay      = null
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
            sinRay = Math.sin(currRay);
            cosRay = Math.cos(currRay);

			horizYIncr  = (sinRay > 0) ? -unit : unit; // casting up - negative Y 
			vertXIncr   = (cosRay > 0) ? unit : -unit;  // castingright - positive X
			horizStartY = (horizYIncr < 0) ? normalizedY - 1 : normalizedY + unit; // pull point into grid block
			vertStartX  = (vertXIncr < 0) ? normalizedX - 1 : normalizedX + unit;   // ""

        	// get first horizontal intercept
        	castY = horizStartY;
        	castX = player.x + (player.y-castY) / tanRay;

        	if (tileAt(castX, castY) > 0) { 
        		horizHit = { x: castX, y: castY };
			} else {
				horizXIncr = unit/tanRay;

				// cast for horizontal intercepts or edge of level
				while (castY > 0 && castY << unitShift < Level.current.map.length && !horizHit) {
					castY += horizYIncr;
					castX += horizXIncr;
					if (tileAt(castX, castY) > 0) {
						horizHit = { x: castX, y: castY }
					}
				}
			}

			horizDist = (horizDist) ? Math.abs(player.x - horizHit.x) / cosRay : 0;

			// get first vertical intercept
			castX = vertStartX;
			castY = player.y + (player.x - castX) * tanRay;

			if (tileAt(castX, castY) > 0) {
				vertHit = { x: castX, y: castY };
			} else {
				vertYIncr = unit * tanRay;

				// check vertical intercepts
				while (castX > 0 && castX * unit < Level.current.map[0].length && !vertHit) {
					castX += vertXIncr;
					castY += vertYIncr;
					if (tileAt(castX, castY) > 0) {
						vertHit = { x: castX, y: castY };
					}
				}
			}

			vertDist = (vertHit) ? Math.abs(player.x - vertHit.x) / cosRay : 0;
			
			dist[i] = (vertDist < horizDist) ? vertDist : horizDist;

        	currRay += rayAngleRad;
		}

		return dist;
	}

	function draw2d () {
		var i, j;
		Shared.ctx.clearRect(0,0, Shared.canvas.width, Shared.canvas.height); 
		Shared.ctx.save();
		Shared.ctx.scale(.12, .12);
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
		Shared.ctx.lineTo(player.x + 80 * Math.cos(player.angle), player.y + 80 * -Math.sin(player.angle));
		Shared.ctx.stroke();
		Shared.ctx.closePath();

		Shared.ctx.restore();
	}

	Wee.setUpdate(function () {
		Keys.run();
		var rays = cast();


		draw2d();


	});
	window.addEventListener('blur', function () {
		Wee.pause();
	});
	Wee.start();
});
