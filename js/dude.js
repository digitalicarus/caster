define(['shared'], function(Shared) {
	
	var ret = Shared.Class.extend({
		init: function(params) {
			this.angle = params.angle || 0;
			this.x     = params.x || 1;
			this.y     = params.y || 1;
		},
		left: function () {
			this.angle = (this.angle + this.rotSpeed) % Shared.twoPI;
			console.log(Shared.radToDeg(this.angle)); 
		},
		right: function () {
			var next = (this.angle - this.rotSpeed);
			this.angle = (next < 0) ? Shared.twoPI - next : next;
			console.log(Shared.radToDeg(this.angle)); 
		},
		forward: function() {
			this.x += this.moveSpeed * Math.cos(this.angle);
			this.y += this.moveSpeed * -Math.sin(this.angle);
		},
		back: function () {
			this.x -= this.moveSpeed * Math.cos(this.angle);
			this.y -= this.moveSpeed * -Math.sin(this.angle);
		},
		moveSpeed: 5,        // pixels per tick
		rotSpeed: Math.PI/80 // radians per tick - 30 frames to turn 180deg 
	});

	return ret;
});
