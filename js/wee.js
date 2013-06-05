define([], function(){
	var FPS           = 60
	,   rate          = 60
	,   frameCounter  = 0
	,   dt            = 1/60
	,   accrued       = 0.0
	,   last          = Date.now()/1000
	,   cycleCounter  = 0
	,   frameCounter  = 0
	,   droppedFrames = 0
	,   interval      = null
	,   paused        = false
	,   initted       = false
	,   intervalRate  = Math.floor(1000/FPS) - 1
	,   ciCallback    = function(){}
	,   upCallback    = function(){}
	,   rdCallback    = function(){}
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
	var Update = function() {
		frameCounter++;
		droppedFrames++;
		upCallback();
	};
		   
	// This is the one you really want. Draw the result of your state in here.
	var Render = function() {
		rate = (droppedFrames > 0) ? 
			((rate+(FPS/(droppedFrames*2)))/2):
			((rate + FPS)/2);
			
		cycleCounter = (cycleCounter + 1) % FPS;
		frameCounter = (frameCounter + 1) % 1e15;
		// just render every N frames to avoid a jarring display
		droppedFrames = -1;
		rdCallback();
	}; 

	var GameLoop = function() {
		var now = Date.now()/1000;
		accrued += (now-last);
		
		//CheckInput(); input check would normally go here, but this is JavaScript
		while(accrued > dt){
			!paused && Update();
			accrued -= dt;
		}
		!paused && Render();
		last = now;
	};
	
	var Init = function() {
		if(!initted) {
			console.log(this);
			initted = true;
		}
	};
	
	// shim layer with setTimeout fallback
	var requestAnimFrame = (function(){
		return  window.requestAnimationFrame       || 
				window.webkitRequestAnimationFrame || 
				window.mozRequestAnimationFrame    || 
				window.oRequestAnimationFrame      || 
				window.msRequestAnimationFrame     
	})();
	
	var cancelAnimFrame = (function(){
		return  window.cancelAnimationFrame       || 
				window.webkitCancelAnimationFrame || 
				window.mozCancelAnimationFrame    || 
				window.oCancelAnimationFrame      || 
				window.msRequestAnimationFrame     
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
			//Init();
			paused = false;
			if(requestAnimFrame) {
				(function animloop(){
					if(!paused) {
						interval = requestAnimFrame(animloop);
						GameLoop();                          
					}
				})();
			} else {
				interval = setInterval(GameLoop, intervalRate);
			}
		},
		pause:           function() {
			if(interval) { clearInterval(interval); }
			if(requestAnimFrame) { cancelAnimFrame(interval); }
			paused = true;
		}
	}; // public
});
