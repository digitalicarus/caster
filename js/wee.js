/*global define,console*/
define([], function(){
	"use strict";

	var FPS           = 60
	,   rate          = 60
	,   frameCounter  = 0
	,   dt            = 1/60
	,   accrued       = 0.0
	,   last          = Date.now()/1000
	,   cycleCounter  = 0
	,   droppedFrames = 0
	,   interval      = null
	,   paused        = true // internal state
	,   extPause      = true // controlled by start/pause interface
	,   initted       = false
	,   intervalRate  = Math.floor(1000/FPS) - 1
	,   ciCallback    = function(){}
	,   upCallback    = function(){}
	,   rdCallback    = function(){}
	,   pauseCallback = function(){}
	;
	
	// Use this callback to latch your inputs if you want
	// Kinda not useful cause you could latch em when you get the events
	//var CheckInput=    function() {
	//    ciCallback();
	//};
	
	// Updates can happen more frequently than render. This call back 
	// will fire very rapidly. Don't waste much time in here at all!
	// You can use this for collision detection etc. 
	// Just check if you have already updated this render cycle and bail ASAP.
	function update() {
		frameCounter++;
		droppedFrames++;
		upCallback();
	}

	// This is the one you really want. Draw the result of your state in here.
	function render() {
		rate = (droppedFrames > 0) ?
			((rate+(FPS/(droppedFrames*2)))/2):
			((rate + FPS)/2);
			
		cycleCounter = (cycleCounter + 1) % FPS;
		frameCounter = (frameCounter + 1) % 1e15;
		// just render every N frames to avoid a jarring display
		droppedFrames = -1;
		rdCallback();
	}

	function gameLoop() {
		var now = Date.now()/1000;
		accrued += (now-last);
		
		//CheckInput(); input check would normally go here, but this is JavaScript
		while(accrued > dt){
			!paused && update();
			accrued -= dt;
		}
		!paused && render();
		last = now;
	}
	
	function Init() {
		if(!initted) {
			console.log(this);
			initted = true;
		}
	}

	function start() {
		//Init();
		if (paused) {
			paused = false;
			if(requestAnimFrame) {
				(function animloop(){
					if(!paused) {
						interval = requestAnimFrame(animloop);
						gameLoop();
					}
				})();
			} else {
				interval = setInterval(gameLoop, intervalRate);
			}
			console.log("start");
		}
	}

	function pause() {
		if (!paused) {
			if(requestAnimFrame) { cancelAnimFrame(interval); }
			else { clearInterval(interval); }
			interval = undefined;
			console.log("pause");
			paused = true;
		}
	}
	
	// http://stackoverflow.com/questions/1060008/is-there-a-way-to-detect-if-a-browser-window-is-not-currently-active
	// window blurrin and pausin
	(function () {
		var hidden = "hidden"
		,   h      = hidden
		,   v      = "visible"
		,   evtMap = { focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h }
		,   state  = null
		;

		function onchange (e) {
			var target = e.target || e.currentTarget || e.srcElement;
			e = e || window.event;

			if (e.type in evtMap) {
				state = evtMap[e.type];
			} else {
				//state = (this[hidden]) ? h : v; // not so sure about this one
				state = (document[hidden]) ? h : v; // not so sure about this one
			}

			console.log("window state: " + state);

			(state === h) && pause();
			(state === v && !extPause) && start();
		}
 
		// Standards:
		if (hidden in document) {
			document.addEventListener("visibilitychange", onchange);
		} else if ((hidden = "mozHidden") in document) {
			document.addEventListener("mozvisibilitychange", onchange);
		} else if ((hidden = "webkitHidden") in document) {
			document.addEventListener("webkitvisibilitychange", onchange);
		} else if ((hidden = "msHidden") in document) {
			document.addEventListener("msvisibilitychange", onchange);
		} else if ('onfocusin' in document) { // IE 9 and lower:
			document.onfocusin = document.onfocusout = onchange;
		} else { // always -- other older SHOULD be a param?
			window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;
		}
	})();

	// shim layer with setTimeout fallback
	var requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame
		;
	})();
	
	var cancelAnimFrame = (function(){
		return  window.cancelAnimationFrame              ||
				window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame ||
				window.mozCancelRequestAnimationFrame    || window.mozCancelAnimationFrame    ||
				window.oCancelRequestAnimationFrame      || window.oCancelAnimationFrame      ||
				window.msCancelRequestAnimationFrame     || window.msRequestAnimationFrame
		;
	})();
	
	
	return {
		setFPS:          function(fps) {
			FPS          = fps;
			rate         = fps;
			dt           = 1/fps;
			intervalRate = Math.floor(1000/FPS) - 1;
		},
		setIntervalRate: function(rate) {
			intervalRate = rate;
		},
		setCheckInput:   function(func) {
			ciCallback = func;
		},
		setUpdate:       function(func) {
			upCallback = func;
		},
		setRender:       function(func) {
			rdCallback = func;
		},
		setPause:        function(func) {
			pauseCallback = func;
		},
		rate:            function(func) {
			return rate;
		},
		counter:         function() {
			return frameCounter;
		},
		paused:          function() {
			return paused;
		},
		start:           function() {
			extPause = false;
			start();
		},
		pause:           function() {
			extPause = true;
			pause();
		}

	}; // public
});
