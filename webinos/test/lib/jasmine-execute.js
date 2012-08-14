(function() {
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;

    var htmlReporter = new jasmine.TrivialReporter();

    jasmineEnv.addReporter(htmlReporter);

    jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
    };

    var currentWindowOnload = window.onload;

    window.onload = function() {
		if (currentWindowOnload) {
			currentWindowOnload();
		}
		execJasmine();
    };

    function execJasmine() {
		if (typeof webinos === "undefined") {
			alert("webinos not loaded\r\n\r\ntests won't run");
		} else {
			jasmineEnv.execute();
		}
    }
})();
