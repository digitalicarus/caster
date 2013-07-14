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
/*global define*/
define([
		'shared',
		'wee',
		'keys',
		'touch',
		'level',
		'player',
		'cast'
], function (Shared, Wee, Keys, Touch, Level, Player, Caster) {
	"use strict";

	var textureSrc         = 'img/terrain.png'
	,   sky                = Shared.ctx.createLinearGradient(0, 0, 0, Shared.canvas.height >> 1)
	,   floor              = Shared.ctx.createLinearGradient(0, Shared.canvas.height >> 1, 0, Shared.canvas.height)
	,   mobileCtrlSize     = (Shared.canvas.width / 6) >> 0
	,   unitShift          = 6
	,   unit               = 2<<(unitShift-1)
    ,   caster             = new Caster({canvas: Shared.canvas, unit: unitShift-1})
    ,   player             = null
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

	caster.setLevelData(Level.current.map);

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

    document.body.addEventListener('keyup',   function(e) {
		var code = e.which || e.keyCode || e.key;
		//console.log("keyup: "+code);
		if (code === Keys.codes.t) {
            texture = (texture) ? false : true;
        }
        if (code === Keys.codes.l) {
            (caster.lighting) ? caster.setLighting(false): caster.setLighting(true);
        }
	}, false);


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
			left: mobileCtrlSize/0.7,
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
			right: mobileCtrlSize/0.7,
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

	Wee.setRender(function () {
		Keys.run();
		Touch.run();
		var i    = 0
		,   scanIncr = 2
		;

		caster.cast({
			x: player.x,
			y: player.y,
			angle: player.angle
		});

		Shared.ctx.save();
		Shared.ctx.clearRect(0,0, Shared.canvas.width, Shared.canvas.height);
		Shared.ctx.fillStyle = sky;
		Shared.ctx.fillRect(0, 0, Shared.canvas.width, Shared.canvas.height >> 1);
		Shared.ctx.fillStyle = floor;
		Shared.ctx.fillRect(0, Shared.canvas.height>>1, Shared.canvas.width, Shared.canvas.height);

		caster.draw3d();
		if(!Shared.isMobile) {
			caster.draw2d({w: 20, h: 20, x: 80, y: 80, s: 0.2});
		} else {
			caster.draw2d({w: 20, h: 20, x: 80, y: 80, s: 0.05});
		}

		Shared.ctx.restore();
	});
   
	Shared.loadAssets([textureSrc], function () {
		caster.setTexture(Shared.assets[textureSrc]);
		Wee.start();
	});
});
