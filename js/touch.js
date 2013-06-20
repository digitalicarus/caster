// TODO: CSS cleanup (use injected styles), joy function to create joysticks, touch function (pass subject ele + cb) 
define([], function(){  
	var ret      = {}
	,   body     = document.getElementsByTagName('body')[0]
	,   latch    = {} // currently pressed keys
	,   on       = {} // key -> function map
	;
	

	ret.button = function(opts, func) {
		var symbol     = opts.symbol   || '&#8226;' // bullet
		,   name       = opts.name     || (Math.random() * 1e10 >> 0).toString()
		,   from       = opts.from     || 'topleft'
		,   size       = opts.size     || 50
		,   opacity    = opts.opacity  || .3
		,   bgColor    = opts.bg       || 'white'
		,   color      = opts.color    || 'black'
		,   ele        = document.createElement('div')
		,   pos        = {'top':opts.top||null, 'right':opts.right||null, 'bottom':opts.bottom||null, 'left':opts.left||null}
		,   dirRegexen = {'top':/top/,'right':/right/,'bottom':/bottom/,'left':/bottom/}
		,   i          = 0
		;

		ele.innerHTML = symbol;
		ele.style.position = 'absolute';
		ele.style.width = size + 'px';
		ele.style.height = size + 'px';
		ele.style.lineHeight = size + 'px';                     
		ele.style.textAlign = 'center';
		ele.style.fontWeight = '800';
		ele.style.fontSize = size + 'px';
		ele.style.opacity = opacity;
		ele.style.backgroundColor = bgColor;
		ele.style.color = color;
		ele.id = name;

		for(i in dirRegexen) {
			if(dirRegexen.hasOwnProperty(i) && pos[i]) {
				ele.style[i] = pos[i] + 'px';
			}
		}
		ele.borderRadius = '5px';

		function touch (e) {
			var target = e.originalTarget || e.target;
			console.log(target, 'was touched');
			if (target) {
				latch[target.id] = true;
			}
		}
		function untouch (e) {
			var target = e.originalTarget || e.target;
			console.log(target, 'was untouched');
			if (target) {
				delete latch[target.id];
			}
		}

		ele.addEventListener('touchstart', touch);
		ele.addEventListener('touchend', untouch);
		ele.addEventListener('touchcancel', untouch);
		ele.addEventListener('touchleave', untouch);

		on[name] = func;

		return ele;
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
			if(latch[i]) {
				on[i]();
			}
		}
/*		for(var j in off) {
			if(!latch[codes[j]]) {
				off[j]();
			}
		}
		*/
	};
	
	return ret;
});
