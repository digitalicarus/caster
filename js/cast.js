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
	,   defaultStripShift = 1
	,   defaultUnit       = 5 // 2^5 64
	,   DIRECTION         = {
			VERT: 0,
			HORIZ: 1,
			TOP: 0,
			RIGHT: 1,
			BOTTOM: 2,
			LEFT: 3
	    }
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

		if(params.texture) {
			this.setTexture(params.texture);
		}

		// set draw func from proto -- may be replaced after examining params / subsequent sets
		this.draw3d = this.draw3dMin; 
		
		this.cbuf          = {}; //  CAST BUFFER - avoid redeclaration per cast (unsure of declaration cost)
		this.unitShift     = params.unit + 1 || defaultUnit + 1;
		this.unit          = 2 << (this.unitShift-1);
		this.fov           = (params.fov) ? deg2Rad(params.fov) : deg2Rad(defaultFov);
		this.halfFov       = this.fov / 2;

		// this one could be zero so we have to actually check the props
		this.stripShift    = (params.hasOwnProperty('stripShift')) ? params.stripShift|0 : 
		                     (params.hasOwnProperty('stripFactor')) ? params.stripFactor|0 :
	                         (params.hasOwnProperty('strip')) ? params.strip|0 : 
	                         defaultStripShift;
		this.stripWidth    = 1<<this.stripShift;
		// align with canvas pixel or we'll get see through walls when stripwidth is 1
		this.stripNudge    =  (this.stripShift === 0) ? 0.5 : 1;

		this.xRes          = this.xRes || params.xRes; // frustum width in pixels
		this.yRes          = this.yRes || params.yRes; // frustum height in pixels
		this.halfYRes      = this.yRes / 2;
		this.angleIncr     = this.fov / this.xRes;

		// used in casting - stripwidth affects trig table indices
		this.numRays       = this.xRes / this.stripWidth|0;
		this.halfFovOffset = (this.numRays * this.stripWidth)>>1;

		this.frustDist     = (this.xRes>>1) / Math.tan(this.halfFov);
		this.projFactor    = this.unit * this.frustDist; // factor to multiply by distance for 3d projection

		this.castData = {
			dist:     (tArr) ? new Float32Array(this.numRays) : new Array(this.numRays),
			tile:     (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays),
			side:     (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays),
			offset:   (tArr) ? new Uint8Array(this.numRays)   : new Array(this.numRays)
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

		for(i = 0, incr = 0; i <= size; i++, incr += this.angleIncr) {
			for(f in funcs) {
				this[funcs[f] + 'Tab'][i] = Math[funcs[f]](incr);
				this['arc' + cap(funcs[f]) + 'Tab'][i] = 1 / this[funcs[f] + 'Tab'][i]; 
			}
		} 	
	};

	Caster.prototype.tileAtPx = function (x, y) {
		if (x < 0 || y < 0 || x >= this.lvlWidthPx || y >= this.lvlHeightPx) {
			return undefined;
		} else {
			return this.lvl[y >> this.unitShift][x >> this.unitShift];
		}
	};

	Caster.prototype.tileAt = function (x, y) {
		if (x < 0 || y < 0 || x >= this.lvlWidth || y >= this.lvlHeight) {
			return undefined;
		} else {
			return this.lvl[y][x];
		}
	}; 

	Caster.prototype.setCanvas = function (canvas) {
		if (canvas) {
			this.canvas     = canvas;
			this.ctx2d      = canvas.getContext('2d');
			this.xRes       = canvas.width;
			this.yRes       = canvas.height;
			this.halfYRes   = canvas.height;
		}

		return this.canvas;
	};

	Caster.prototype.setTexture = function (imgSrc) {
		this.textureImgSrc = imgSrc;
		this.draw3d = this.draw3dTexture;
	};

	Caster.prototype.unsetTexture = function () {
		this.textureImgSrc = null;
		this.draw3d = this.draw3dMin;
	};

	Caster.prototype.setDrawMin = function () {
		this.draw3d = this.draw3dMin;
	};

	Caster.prototype.setLighting = function (onOff) {
		this.lighting = onOff;
		if (this.lighting && this.textureImgSrc) {
			if (!this.texBuf) {
				this.texBuf = document.createElement('canvas');
				this.texBufCtx = this.texBuf.getContext('2d');
				//TODO: measure image
				this.texBuf.height = 1024;
				this.texBuf.width = 1024;
				this.texBufCtx.drawImage(this.textureImgSrc, 0, 0);
			}
			if (!this.blitBuf) {
				this.blitBuf = document.createElement('canvas');
				this.blitBufCtx = this.blitBuf.getContext('2d');
			}
			this.lightFactor = this.unit << 7;
			this.draw3d = this.draw3dTextureLighting;
		} else if (this.textureImgSrc) {
			this.draw3d = this.draw3dTexture;
		} else {
			this.draw3d = this.draw3dMin;
		}
	};

	Caster.prototype.setLevelData = function (lvl) {
		// TODO: try loading level data into a typed array -- profile reveals a lot of time in tileAtPx
		this.lvl = lvl;
		if (lvl instanceof Array) {
			this.lvlHeight = lvl.length;
			this.lvlWidth  = lvl[0].length;
			this.lvlHeightPx = this.lvlHeight<<this.unitShift;
			this.lvlWidthPx  = this.lvlWidth<<this.unitShift;
		}
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
		// does shortcut allocation really mitigate the cost?
		var c = this.cbuf; // short ref

		c.i           = 0;
		c.angleIdx    = (params.angle) ? this.angleToIdx(params.angle) : null;
		c.x           = params.x || null;
		c.y           = params.y || null;
		c.currRayIdx  = (c.angleIdx + this.halfFovOffset) % this.tableLength; // roll over
		c.normalizedY = c.y >> this.unitShift << this.unitShift; // find grid location
		c.normalizedX = c.x >> this.unitShift << this.unitShift; // "" 

		// We'll do these LIVE >:D .. dynamically in the loop
		// fishCorrect, tanRay, tanRayInv, sinRay, sinRayInv, cosRay, cosRayInv, horizYIncr,
		// vertXIncr, horizXIncr, vertYIncr, horizStartY, vertStartX, castY, castX, horizHit,
		// vertHit, horizDist, vertDist, tmp

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
			c.tmp         = (c.tmp < 0) ? this.tableLength + c.tmp : (c.tmp > this.tableLength) ? c.tmp % this.tableLength : c.tmp;
			c.fishCorrect = this.cosTab[c.tmp]; // roll over 0

			c.horizYIncr  = (c.sinRay > 0) ? -this.unit : this.unit; // casting up - negative Y 
			c.vertXIncr   = (c.cosRay > 0) ? this.unit : -this.unit;  // castingright - positive X
			c.horizStartY = (c.horizYIncr < 0) ? c.normalizedY - 1 : c.normalizedY + this.unit; // pull point into grid block
			c.vertStartX  = (c.vertXIncr < 0) ? c.normalizedX - 1 : c.normalizedX + this.unit;  // ""

			// get first horizontal intercept
			c.castY = c.horizStartY;
			c.castX = c.x + (c.y - c.castY) * c.tanRayInv; // chance to divide by 0 FIXME

			if ((c.tmp = this.tileAtPx(c.castX, c.castY)) !== 0) {
				c.horizHit = { x: c.castX, y: c.castY, t: c.tmp };
			} else {
				c.horizXIncr = (c.horizYIncr < 0) ? this.unit * c.tanRayInv : -this.unit * c.tanRayInv;

				// cast for horizontal intercepts or edge of level
				while (c.castY > 0 && c.castX > 0
						&& c.castY >> this.unitShift < this.lvl.length
						&& c.castX >> this.unitShift < this.lvl[0].length
						&& !c.horizHit) {
					c.castY += c.horizYIncr;
					c.castX += c.horizXIncr;
					if ((c.tmp = this.tileAtPx(c.castX, c.castY)) !== 0) {
						c.horizHit = { x: c.castX, y: c.castY, t: c.tmp };
						break;
					}
				}
				if(!c.horizHit) {
					//c.horizHit = { x: c.castX, y: c.castY };
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//horizDist = (horizHit) ? Math.abs(-player.x + horizHit.x / cosRay) : Infinity; // chance to divide by 0 FIXME
			// I think divide by zero is cool brah .. maybe the ray is super long. TODO: fix when ray limiting impl
			c.horizDist = (c.horizHit) ? Math.sqrt(Math.pow(c.x - c.horizHit.x, 2) + Math.pow(c.y - c.horizHit.y, 2)) : Infinity; // chance to divide by 0 FIXME

			// get first vertical intercept
			c.castX = c.vertStartX;
			c.castY = c.y + (c.x - c.castX) * c.tanRay;

			if ((c.tmp2 = this.tileAtPx(c.castX, c.castY)) !== 0) {
				c.vertHit = { x: c.castX, y: c.castY, t: c.tmp2 };
			} else {
				c.vertYIncr = (c.vertXIncr < 0) ? this.unit * c.tanRay : -this.unit * c.tanRay;

				// check vertical intercepts
				while ( c.castX > 0 && c.castY > 0
						&& c.castY >> this.unitShift < this.lvl.length
						&& c.castX >> this.unitShift < this.lvl[0].length
						&& !c.vertHit) {
					c.castX += c.vertXIncr;
					c.castY += c.vertYIncr;
					if ((c.tmp2 = this.tileAtPx(c.castX, c.castY)) !== 0) {
						c.vertHit = { x: c.castX, y: c.castY, t: c.tmp2 };
					}
				}
			}

			// TODO: figure out problem with triangle method when we do discrete trig tables
			//vertDist = (vertHit) ? Math.abs(-player.x + vertHit.x / cosRay) : Infinity;
			c.vertDist = (c.vertHit) ? Math.sqrt(Math.pow(c.x - c.vertHit.x, 2) + Math.pow(c.y - c.vertHit.y, 2)) : Infinity; // chance to divide by 0 FIXME
			
			if (c.vertDist < c.horizDist) {
				this.castData.dist[c.i]   = c.vertDist * c.fishCorrect;
				this.castData.tile[c.i]   = c.vertHit.t;
				this.castData.side[c.i]   = DIRECTION.VERT; // 0 vert 1 horiz, TODO: 0 top 1 right 2 bottom 3 left
				this.castData.offset[c.i] = c.vertHit.y % this.unit; 
			} else {
				this.castData.dist[c.i]   = c.horizDist * c.fishCorrect;
				this.castData.tile[c.i]   = c.horizHit.t;
				this.castData.side[c.i]   = DIRECTION.HORIZ; // 0 vert 1 horiz, TODO: 0 top 1 right 2 bottom 3 left
				this.castData.offset[c.i] = c.horizHit.x % this.unit;
			}

			c.currRayIdx -= this.stripWidth;
			if (c.currRayIdx < 0) { c.currRayIdx = this.tableLength + c.currRayIdx; }
		}

		return this.castData; 
	};

	Caster.prototype.draw2d = function (params) {
		var c = this.cbuf; // short ref
		params = params || 1;

		c.w  = params.w || params.width  || 10; // game units
		c.h  = params.h || params.height || 8;  // game units
		c.s  = params.s || params.scale  || 0.1;  // game units
		c.ca = params.a || params.alpha  || 0.5;
		c.cx = params.x || params.cx     || 0;
		c.cy = params.y || params.cy     || 0;

		c.wclip = c.cx + (c.w<<this.unitShift);
		c.hclip = c.cy + (c.h<<this.unitShift);

		// render 1 beyond clipped area
		c.w += 1;
		c.h += 1;

		//TODO: adjust start and end for canvas boundaries to avoid undue iterations below
		//TODO: save refs to pixel and tile versions of variables and stop all the needless shift dupes
		c.wstart = c.tileX = (c.x>>this.unitShift) - (c.w>>1);
		c.hstart = c.tileY = (c.y>>this.unitShift) - (c.h>>1);
		c.wend   = c.wstart + c.w;
		c.hend   = c.hstart + c.h;
		c.px2d   = c.cx + (c.w>>1<<this.unitShift);
		c.py2d   = c.cy + (c.h>>1<<this.unitShift);

		// setup context
		this.ctx2d.save();
		this.ctx2d.scale(c.s, c.s);
		this.ctx2d.globalAlpha = c.ca;

		// clip
		this.ctx2d.beginPath();
		this.ctx2d.moveTo(c.cx, c.cy);
		this.ctx2d.lineTo(c.wclip, c.cy);
		this.ctx2d.lineTo(c.wclip, c.hclip);
		this.ctx2d.lineTo(c.cx, c.hclip);
		this.ctx2d.clip();

		// backdrop
		this.ctx2d.fillStyle = "#666";
		this.ctx2d.fillRect(c.cx, c.cy, c.w<<this.unitShift, c.hclip<<this.unitShift);
 
		// level
		this.ctx2d.strokeStyle = "white";
		this.ctx2d.fillStyle   = "#288";
		this.ctx2d.lineWidth = 1/c.s;

		for ( c.i = 0; c.tileY < c.hend; c.i++, c.tileY++ ) {
			for ( c.j = 0; c.tileX < c.wend; c.j++, c.tileX++ ) {
				if (this.tileAt(c.tileX, c.tileY)) {
					this.ctx2d.strokeRect((c.j<<this.unitShift) + c.cx - c.x%this.unit, (c.i<<this.unitShift) + c.cy - c.y%this.unit, this.unit, this.unit);
					this.ctx2d.fillRect((c.j<<this.unitShift) + c.cx - c.x%this.unit, (c.i<<this.unitShift) + c.cy - c.y%this.unit, this.unit, this.unit);
				}
			}
			c.tileX = c.wstart;
		}

		// player
		this.ctx2d.strokeStyle = "red";
		this.ctx2d.fillStyle   = "red";
		this.ctx2d.lineWidth   >>= 1;
		this.ctx2d.fillRect(c.px2d, c.py2d, this.unit>>2, this.unit>>2);
		this.ctx2d.beginPath();
		this.ctx2d.moveTo(c.px2d, c.py2d);
		this.ctx2d.lineTo(c.px2d + (this.unit<<1) * this.cosTab[c.angleIdx], c.py2d + (this.unit<<1) * -this.sinTab[c.angleIdx]);
		this.ctx2d.stroke();
		this.ctx2d.closePath();

		this.ctx2d.restore();

	};

	// this could probably go in a separate utility module... but then we couldn't use our massive c buffer
	Caster.prototype.blitScale = function (tex, tX, tY, tW, tH, dst, dX, dY, dW, dH, filter) {
		var c = this.cbuf;

		c.scaleX = dW/tW;
		c.scaleY = dH/tH;
		c.blitW  = (c.scaleX < 1) ? dW : tW;
		c.blitH  = (c.scaleY < 1) ? dH : tH;
		c.destW  = (c.scaleX < 1) ? dW : dW * c.scaleX;
		c.destH  = (c.scaleY < 1) ? dH : dH * c.scaleY;
		
		// if one scale is < 1 then we have to blit that scale to buf canvas
		// to avoid cutting off the texture
		this.blitBufCtx.drawImage(this.texBuf,tX,tY,tW,tH,0,0,c.blitW,c.blitH);

		filter
		&& typeof filter === 'function'
		&& this.blitBufCtx.putImageData (
			filter(
				this.blitBufCtx.getImageData(0,0,c.blitW,c.blitH),c.blitW,c.blitH
			),0,0
		);
		
		this.ctx2d.drawImage(this.blitBuf,0,0,c.blitW,dH,dX,dY,dW*c.scaleX,dH*((c.scaleY < 1) ? 1 : c.scaleY));
	};
 

	// got more 3d rendering funcs than my laser jet got fonts
	Caster.prototype.draw3dMin = function (params) {
		var c = this.cbuf;

		this.ctx2d.save();
		this.ctx2d.strokeStyle = "green";
		this.ctx2d.lineWidth = this.stripWidth;
		for( c.i = 0; c.i < this.numRays; c.i++ ) {
			c.halfStripHeight = (this.projFactor / this.castData.dist[c.i]) / 2;
			c.draw3dXCoord = (c.i<<this.stripShift) + this.stripNudge;

			this.ctx2d.beginPath();
			this.ctx2d.moveTo(c.draw3dXCoord, this.halfYRes - c.halfStripHeight);
			this.ctx2d.lineTo(c.draw3dXCoord, this.halfYRes + c.halfStripHeight);
			this.ctx2d.stroke();

			this.ctx2d.closePath();
		}
		this.ctx2d.restore();
	};
 
	Caster.prototype.draw3dTexture = function (params) {
		var c = this.cbuf;

		this.ctx2d.save();
		for( c.i = 0; c.i < this.numRays; c.i++ ) {
			c.stripHeight = this.projFactor / this.castData.dist[c.i];
			this.ctx2d.drawImage(
					this.textureImgSrc,
					((this.castData.tile[c.i] << this.unitShift) + this.castData.offset[c.i]),
					0,
					1, //stripWidth, //try sampling the whole strip width - hmm, looks weird, stick with 1px for now
					this.unit,
					c.i<<this.stripShift,
					this.halfYRes - c.stripHeight / 2,
					this.stripWidth,
					c.stripHeight 
			); 
		}
		this.ctx2d.restore();
	};

	Caster.prototype.draw3dTextureLighting = function (params) {
		var c = this.cbuf
		,   that = this
		;

		function lightMyFire(data) {
			c.j = 0;
			c.light = (this.lightFactor) / (this.castData.dist[c.i] * (this.castData.dist[c.i]>>1));
				
			while(c.j<data.data.length) {
				while(i%4!==3) {
					data.data[c.j++] *= c.light;
				}
				c.j++;
			}
			return data;
		}

		function drawWithLighting(i, stripHeight) {
			that.blitScale(
				that.textureImgSrc,
				((that.castData.tile[c.i] << that.unitShift) + that.castData.offset[c.i]),
				0,
				1, //stripWidth, //try sampling the whole strip width - hmm, looks weird, stick with 1px for now
				that.unit,
				c.i<<that.stripShift,
				that.halfYRes - c.stripHeight / 2,
				that.stripWidth,
				c.stripHeight,
				lightMyFire
			);
		}
		this.ctx2d.save();

		for( c.i = 0; c.i < this.numRays; c.i++ ) {
			c.stripHeight = this.projFactor / this.castData.dist[c.i];
			drawWithLighting(); // it's all in cBuf... so no params y'all
		}
		this.ctx2d.restore();
	};

	window.Caster = Caster;
	return Caster;
});
