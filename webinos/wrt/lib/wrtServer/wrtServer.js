(function (exports) {

	exports.start = function (callback) {
		var express = require('express');
		var fs = require('fs');
		var path = require('path');
		var common = require('../../../pzp/lib/session_common');
		var log = new common.debug("wrtServer");

		// Default port
		var runtimeServerPort = 53510;

		// Create the express app
		var app = express.createServer();
		app.register('.jade', require('jade'));
		app.set('view engine', 'jade');
		app.set('views', __dirname + '/views');
		app.use(express.static(path.join(__dirname,'/static')));
		app.use(express.static(path.join(__dirname,'../../../test')));
		app.use(express.bodyParser());

		app.configure(function () {
			app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
			//app.use(express.logger());
		});

		// Load routing
		var stores = require('./routes/stores');
		var apps = require('./routes/apps');
		var settings = require('./routes/settings');
		var widgetTests = require('./routes/widgetTests');

		// apps routing
		app.get('/', apps.installed);
		app.get('/apps', apps.installed);
		app.get('/install/:id', apps.install);
		app.get('/uninstall/:id', apps.uninstall);
		app.get('/widget/:id', apps.boot);
		app.get('/widget/:id/*', apps.run);
		app.get('/sideLoad/:id', apps.sideLoad);
		
		// widget testing
		app.get('/widget-tests', widgetTests.listTestWidgets);

		// stores routing
		app.get('/stores', stores.stores);
		//app.get('/store', stores.list);		

		// settings routing
		app.get('/settings/:saved', settings.getSettings);
		app.post('/settings/*', settings.saveSettings);
		app.get('/about', settings.about);

		// tests routing
		app.get('/tests', function (req, res) {
			res.render('tests', { pageTitle: 'tests' });
		});
		
		// Write port to config file on successful connection
		app.on('listening', function () {
			log.info('server started on port ' + runtimeServerPort);
			settings.setWRTPort(runtimeServerPort);
			callback("startedWRT",runtimeServerPort);
		});

		// Intercept port-in-use errors and try connecting on different port
		app.on('error', function (err) {
			log.info(err);
			if (err.code === "EADDRINUSE") {
				runtimeServerPort++;
				log.info("runtimeWebServer address in use, now trying port " + runtimeServerPort);
				app.listen(runtimeServerPort, "localhost");
			}
		});

		app.listen(runtimeServerPort, "localhost");
	};

} (module.exports));
