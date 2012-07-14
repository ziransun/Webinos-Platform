(function(exports) {

    var http = require('http');
    var url = require('url');
    var fs = require('fs');
    var wm = require('../../../../common/manager/widget_manager/index.js');
    var common = require('../../../../pzp/lib/session_common');

    function downloadFile(fileURL, callback) {
        console.log('Downloading file: ' + fileURL);

        var host = url.parse(fileURL).hostname;
        var port = url.parse(fileURL).port;
        var path = url.parse(fileURL).path;
        var filename = url.parse(fileURL).pathname.split('/').pop()

        var options = {
            host: host,
            port: port,
            path: path,
        };

        var clientReq = http.get(options, function (clientResponse) {
            var targetFilePath = common.webinosConfigPath() + '/widget-downloads/' + filename;
            var downloadfile = fs.createWriteStream(targetFilePath, {'flags': 'w'});
            downloadfile.on('close',function() { callback(true, targetFilePath); });
        
            clientResponse.setEncoding('binary');
            clientResponse.addListener('data', function (chunk) {
                downloadfile.write(chunk, encoding='binary');
            });
        
            clientResponse.addListener('end', function() {
                downloadfile.end();
                console.log('Finished downloading ' + fileURL);                
            });
        });

        clientReq.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            callback(false);
        });        
    }

    function installWidget(wgt, callback) {
        console.log("installing " + wgt);

        function handlePendingInstall(processingResult) {
            var installId = processingResult.getInstallId();

            if (processingResult.status) {
                console.log('wm: pendingInstall error: install: ' + processingResult.status);
                if (installId) {
                    wm.widgetmanager.abortInstall(installId);
                }
                callback(false);
            } else {
                console.log("******** completing install: " + installId);
            
                var result = wm.widgetmanager.completeInstall(installId, true);
                if (result) {
                    console.log('wm: completeInstall error: install: ' + result);
                    callback(false);
                } else {
                    console.log('wm: install complete');
                    callback(true, installId);
                }
            }
        }

        wm.widgetmanager.prepareInstall(wgt, {}, handlePendingInstall);
    }

    function uninstallWidget(id, callback) {
        if (wm.widgetmanager.uninstall(id))
            callback(false);
        else
            callback(true);
    }

    exports.installed = function (req, res) {
        var cfgs = [];

        var lst = wm.widgetmanager.getInstalledWidgets();
        for (var idx in lst) {
            var cfg = wm.widgetmanager.getWidgetConfig(lst[idx]);
            if (cfg) {
                cfgs.push(cfg);
            }
        }

        res.render('apps', { pageTitle: 'installed apps', list: cfgs });
    };

    exports.install = function (req, res) {
        downloadFile('http://webinos.two268.com/apps/' + req.param('id', 'missing') + '/' + req.param('id', 'missing'), function (ok, wgt) {
            if (ok) {
                installWidget(wgt, function (ok, installId) {
                    if (ok)
                        res.render('install', { pageTitle: 'install', id: req.param('id', 'missing!'), success: ok, installId: installId });
                    else
                        res.render('install', { pageTitle: 'install failed', id: req.param('id', 'missing!'), success: ok });
                });
            }
            else
                res.render('install', { pageTitle: 'install download failed', id: req.param('id', 'missing!') });
        });
    };

    exports.uninstall = function (req, res) {
        uninstallWidget(req.param('id', 'missing id!'), function (ok) {
            res.render('uninstall', { pageTitle: 'uninstall', id: req.param('id', 'missing id!'), success: ok });
        });
    };

}(module.exports));
