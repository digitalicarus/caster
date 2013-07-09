/*global define,console*/
define([], function () {
	"use strict";

	// Default constants + helpers
	var twoPI             = Math.PI * 2
	,   tArr              = !!Float32Array
	,   rad2Deg           = function (rad) { return (rad * 180) / Math.PI; }
	,   deg2Rad           = function (deg) { return (deg * Math.PI) / 180; }
	,   cap               = function (str) { return str.charAt(0).toUpperCase() + str.slice(1); }
	,   defaultFov        = 64
	,   defaultStripWidth = 2
	,   defaultUnit       = 5 // 2^5 64
	;

	var Caster  = function (params) {
  
		if (!params)      { throw "Must supply parameters to create a Caster"; }
		if (!params.unit) { console.log("Advise: supply a 'unit' param (power of 2) to Caster constructor"); }
		if (!params.xRes && !params.canvas) {
			throw "Must supply a 'xRes' param to Caster constructor for trig table gen. " + 
				"Alternatively, a 'canvas' param/element.";
		}

 		if(params.canvas) {
 			this.setCanvas(params.canvas);
		}
		
		this.cbuf          = {}; //  CAST BUFFER - avoid redeclaration per cast (unsure of declaration cost)
 		this.unitShift     = params.unit + 1 || defaultUnit + 1;
		this.unit          = 2 << (this.unitShift-1);
		this.fov           = (params.fov) ? deg2Rad(params.fov) : deg2Rad(defaultFov);
		this.halfFov       = this.fov / 2;
		this.stripWidth    = params.stripWidth|0 || 2;

		this.xRes          = this.xRes || params.xRes; // frustum width in pixels
		this.angleIncr     = this.fov / this.xRes;
		this.numRays       = this.xRes / this.stripWidth|0;
		this.halfFovOffset = this.numRays / 2|0;

		this.castData = {
			dist:   (tArr) ? new Float32Array(this.numRays) : new Array(this.numRays),
			tile:   (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays),
			side:   (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays),
			offset: (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays)
		};

		// init
		this.setLevelData(params.lvl || params.level || params.levelData || null);
		this._genTrigTables();
	};

	Caster.prototype._genTrigTables = function () {
		var i     = 0
		,   f     = null
		,   incr  = 0
		,   size  = (Math.PI * 2) / this.angleIncr |0
		,   funcs = ['tan', 'sin', 'cos']
		;

		this.tableLength = size;
		for (f in funcs) {
			this[funcs[f] + 'Tab']              = (tArr) ? new Float32Array(size) : new Array(size);
			this['arc' + cap(funcs[f]) + 'Tab'] = (tArr) ? new Float32Array(size) : new Array(size);
		}
   	
		for(i = 0, incr = 0; i < size; i++, incr += this.angleIncr) {
			for(f in funcs) {
				this[funcs[f] + 'Tab'][i] = Math[funcs[f]](incr);
				this['arc' + cap(funcs[f]) + 'Tab'][i] = 1 / this[funcs[f] + 'Tab'][i]; 
			}
		} 	
	};

	Caster.prototype.tileAt = function (x, y) {
		try {
			return this.lvl[y >> this.unitShift][x >> this.unitShift];
		} catch (e) {
			return undefined;
		}
	};

	Caster.prototype.setCanvas = function (canvas) {
		this.canvas = canvas;
		this.xRes   = canvas.width;
		this.yRes   = canvas.height;
	};

	Caster.prototype.setLevelData = function (lvl) {
		this.lvl = lvl;
	};

	Caster.prototype.angleToIdx = function (angle) {
		angle %= twoPI;
		return angle / this.angleIncr |0;
	};
	Caster.prototype.idxToAngle = function (idx) {
		idx %= this.trigTabLength |0;
		return idx * this.angleIncr;
	};

	Caster.prototype.cast = function (params) {
		var c = this.cbuf; // short ref

		c.i           = 0;
		c.angleIdx    = (params.angle) ? this.angleToIdx(params.angle) : null;
		c.x           = params.x || null;
		c.y           = params.y || null;
		c.currRayIdx  = (c.angleIdx + this.halfFovOffset) % this.tableLength; // roll over
		c.normalizedY = c.y >> this.unitShift << this.unitShift; // find grid location
		c.normalizedX = c.x >> this.unitShift << this.unitShift; // "" 

		// We'll do these LIVE >:D .. dynamically in the loop
//		c.fishCorrect = null;
//		c.tanRay      = null;
//		c.tanRayInv   = null;
//		c.sinRay      = null;
//		c.sinRayInv   = null;
//		c.cosRay      = null;
//		c.cosRayInv   = null;
//		c.horizYIncr  = null;
//		c.vertXIncr   = null;
//		c.horizXIncr  = null;
//		c.vertYIncr   = null;
//		c.horizStartY = null;
//		c.vertStartX  = null;
//		c.castY       = null;
//		c.castX       = null;
//		c.horizHit    = null;
//		c.vertHit     = null;
//		c.horizDist   = null;
//		c.vertDist    = null;
//		c.tmp         = null; // general purpose

		// too costly to check? should offload into set methods and let this just crash and burn?
		if (!this.lvl)   { throw "set 'levelData' upon construction or via setLevelData prior to cast"; }
		if (!c.angleIdx)        { throw "cast must be passed a 'angle' parameter"; }
		if (!c.x || !c.y)    { throw "cast must be passed a 'x' and 'y' location parameter"; }
        
        // TODO: change to zero compare decr loop
        for (; c.i < this.numRays; c.i++) {
			c.rayObj      = {};
            c.tanRay      = this.tanTab[c.currRayIdx];
            c.tanRayInv   = this.arcTanTab[c.currRayIdx]; // reciprocal mult is faster than divide in some browsers
            c.sinRay      = this.sinTab[c.currRayIdx];
            c.cosRay      = this.cosTab[c.currRayIdx];
            c.vertHit     = null;
            c.horizHit    = null;
            c.tmp         = c.angleIdx - c.currRayIdx;
            c.fishCorrect = this.cosTab[((c.tmp < 0) ? this.tableLength + c.tmp : c.tmp)]; // roll over 0

			c.horizYIncr  = (c.sinRay > 0) ? -this.unit : this.unit; // casting up - negative Y 
			c.vertXIncr   = (c.cosRay > 0) ? this.unit : -this.unit;  // castingright - positive X
			c.horizStartY = (c.horizYIncr < 0) ? c.normalizedY - 1 : c.normalizedY + this.unit; // pull point into grid block
			c.vertStartX  = (c.vertXIncr < 0) ? c.normalizedX - 1 : c.normalizedX + this.unit;  // ""

			// get first horizontal intercept
			c.castY = c.horizStartY;
			c.castX = c.x + (c.y - c.castY) * c.tanRayInv; // chance to divide by 0 FIXME

			if (this.tileAt(c.castX, c.castY) > 0) {
				c.horizHit = { x: c.castX, y: c.castY };
			} else {
				c.horizXIncr = (c.horizYIncr < 0) ? this.unit * c.tanRayInv : -this.unit * c.tanRayInv;

				// cast for horizontal intercepts or edge of level
				while (c.castY > 0 && c.castX > 0
						&& c.castY >> this.unitShift < this.lvl.length
						&& c.castX >> this.unitShift < this.lvl[0].length
						&& !c.horizHit) {
					c.castY += c.horizYIncr;
					c.castX += c.horizXIncr;
					if (this.tileAt(c.castX, c.castY) > 0) {
						c.horizHit = { x: c.castX, y: c.castY };
						break;
					}
				}
				if(!c.horizHit) {
					c.horizHit = { x: c.castX, y: c.castY };
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//horizDist = (horizHit) ? Math.abs(-player.x + horizHit.x / cosRay) : Infinity; // chance to divide by 0 FIXME
			// I think divide by zero is cool brah .. maybe the ray is super long. TODO: fix when ray limiting impl
			c.horizDist = (c.horizHit) ? Math.sqrt(Math.pow(c.x - c.horizHit.x, 2) + Math.pow(c.y - c.horizHit.y, 2)) : Infinity; // chance to divide by 0 FIXME

			// get first vertical intercept
			c.castX = c.vertStartX;
			c.castY = c.y + (c.x - c.castX) * c.tanRay;

			if (this.tileAt(c.castX, c.castY) > 0) {
				c.vertHit = { x: c.castX, y: c.castY };
			} else {
				c.vertYIncr = (c.vertXIncr < 0) ? this.unit * c.tanRay : -this.unit * c.tanRay;

				// check vertical intercepts
				while ( c.castX > 0 && c.castY > 0
						&& c.castY >> this.unitShift < this.lvl.length
						&& c.castX >> this.unitShift < this.lvl[0].length
						&& !c.vertHit) {
					c.castX += c.vertXIncr;
					c.castY += c.vertYIncr;
					if (this.tileAt(c.castX, c.castY) > 0) {
						c.vertHit = { x: c.castX, y: c.castY };
					}
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//vertDist = (vertHit) ? Math.abs(-player.x + vertHit.x / cosRay) : Infinity;
			c.vertDist = (c.vertHit) ? Math.sqrt(Math.pow(c.x - c.vertHit.x, 2) + Math.pow(c.y - c.vertHit.y, 2)) : Infinity; // chance to divide by 0 FIXME
			
			if (c.vertDist < c.horizDist) {
				this.castData.dist[c.i]   = c.vertDist;
				this.castData.tile[c.i]   = this.tileAt(c.vertHit.x, c.vertHit.y);
				this.castData.side[c.i]   = 0; // 0 vert 1 horiz, TODO: 0 top 1 right 2 left 3 bottom
				this.castData.offset[c.i] = c.vertDist % this.unit; 
			} else {
				this.castData.dist[c.i]   = c.horizDist;
				this.castData.tile[c.i]   = this.tileAt(c.horizHit.x, c.horizHit.y);
				this.castData.side[c.i]   = 0; // 0 horiz 1 horiz, TODO: 0 top 1 right 2 left 3 bottom
				this.castData.offset[c.i] = c.horizDist % this.unit;
			}

			c.currRayIdx -= 1;
			if (c.currRayIdx < 0) { c.currRayIdx = this.tableLength - 1; }
		}

		return this.castData; 
	};

	Caster.prototype.draw2d = function (params) {
	};

	Caster.prototype.draw3d = function (params) {
	};

	window.Caster = Caster;
});
