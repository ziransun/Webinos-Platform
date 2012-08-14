(function(exports) {
    
    var http = require('http');
    var fs = require('fs');
    var common = require('../../../../pzp/lib/session_common');

	exports.stores = function (req, res) {
		fs.readFile((common.webinosConfigPath() + '/wrt/webinos_stores.json'), function (err, data) {
			if (err) {
				console.log(err);
			} else {
				var storesData = data.toString('utf8');
				var stores = JSON.parse(storesData);
			}
			res.render('stores', { pageTitle: 'online stores', stores: stores });
		});
	};
	
    exports.list = function (req, res) {
		var options = {
			host: 'webinos.two268.com',
			port: 80,
			path: '/Store/List',
		};
        var bodyDataStr = '';
        var clientReq = http.get(options, function (clientResponse) {
            clientResponse.setEncoding('utf8');
            clientResponse.on('data', function (chunk) {
                bodyDataStr += chunk;
            });
            clientResponse.on('end', function () {
                console.log(bodyDataStr);
                var bodyData = JSON.parse(bodyDataStr);
                res.render('store', { pageTitle: 'online store', storeData: bodyData });     
            });
        });

        clientReq.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            res.render('store', { pageTitle: 'online store', storeData: {} });     
        });        
    };

}(module.exports));
