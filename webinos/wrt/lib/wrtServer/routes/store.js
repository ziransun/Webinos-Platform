(function(exports) {
    
    var http = require('http');

    var options = {
        host: 'webinos.two268.com',
        port: 80,
        path: '/Store/List',
    };

    exports.list = function (req, res) {
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
