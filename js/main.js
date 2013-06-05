requirejs.config({
	paths: {
		"class": "vendor/class"
	},
	shim: {
		"class": { exports: "Class" }
	}
});

require(['game'], function (Game) {});
