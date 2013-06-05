// TODO: move into Wee
define([], function(){  
	var ret      = {}
	,   body     = document.getElementsByTagName('body')[0]
	,   codes    = {
			" ":      32
		,   "left":   37
		,   "up":     38
		,   "down":  40 
		,   "right":  39
		,   "enter":  13
		,   "escape": 27
		,   w:        87
		,   a:        65
		,   s:        83
		,   d:        68
		,   q:        81
		,   e:        69
		}
	,   latch    = {} // currently pressed keys
	,   on       = {} // key -> function map
	,   off      = {} // key -> function map
	;
	
	body.addEventListener('keydown', function(e) {
		var code = e.which || e.keyCode || e.key;
		//if(!latch[code]) {console.log("keydown: "+code);}
		latch[code] = true;
	}, false);
	
	body.addEventListener('keyup',   function(e) {
		var code = e.which || e.keyCode || e.key;
		//console.log("keyup: "+code);
		delete latch[code];
	}, false);
	
	ret.on = function(key, func) {
		on[key] = func;
	};
	
	ret.off = function(key, func) {
		off[key] = func;
	};
	
	ret.getKeys = function() {
		return keyLatch;
	};
	
	ret.keyPressed = function(key) {
		if(codes[key]) {
			return latch[codes[key]];
		}
		return false;
	};
	
	ret.run = function() {
		for(var i in on) {
			if(latch[codes[i]]) {
				on[i]();
			}
		}
		for(var j in off) {
			if(!latch[codes[j]]) {
				off[j]();
			}
		}
	};
	
	return ret;
});
