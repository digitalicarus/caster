/*global define,console*/
define([], function () {
	"use strict";
	var twoPI             = Math.PI * 2
	,   tArr              = !!Float32Array
	,   rad2Deg           = function (rad) { return (rad * 180) / Math.PI; }
	,   deg2Rad           = function (deg) { return (deg * Math.PI) / 180; }
	,   cap               = function (str) { return str.charAt(0).toUpperCase() + str.slice(1); }
	,   defaultFov        = 64
	,   defaultStripWidth = 2
	;

	var Caster  = function (params) {

		if (!params) {
			throw "Must supply parameters to create a Caster";
		}
		if (!params.unit) {
			throw "Must supply a 'unit' param (power of 2) to Caster constructor";
		}
		if (!params.xRes && !params.canvas) {
			throw "Must supply a 'xRes' param to Caster constructor for trig table gen. " + 
				"Alternatively, a 'canvas' param/element.";
		}
 
 		if(params.canvas) {
 			this.setCanvas(params.canvas);
		}
		
		// radians per tick - 30 frames to turn 180deg.. used to gen trig tables
		//this.angleIncr = params.angleIncr || Math.PI/80 
		this.fov = (params.fov) ? deg2Rad(params.fov) : deg2Rad(defaultFov);
		this.halfFov = this.fov / 2;
		this.stripWidth = params.stripWidth|0 || 2;
		this.frustWidth  = params.xRes|0 || this.xRes; // used with stripWidth to cast rays .. frustWidth + fov used for trig tables
		this.angleIncr = this.fov / this.xRes;

		this.castData = {};

		// init
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

	Caster.prototype.setCanvas = function (canvas) {
		this.canvas = canvas;
		this.xRes   = canvas.width;
		this.yRes   = canvas.height;
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
	};

	Caster.prototype.draw2d = function (params) {
	};

	Caster.prototype.draw3d = function (params) {
	};

	window.Caster = Caster;
});
