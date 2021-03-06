/*******************************************************************************
*  Code contributed to the webinos project
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* Copyright 2011 Habib Virji, Samsung Electronics (UK) Ltd
*******************************************************************************/
var configure = exports;

var path          = require('path');
var fs            = require('fs');
var os            = require('os');

var moduleRoot    = require(path.resolve(__dirname, '../dependencies.json'));
var dependencies  = require(path.resolve(__dirname, '../' + moduleRoot.root.location + '/dependencies.json'));
var webinosRoot   = path.resolve(__dirname, '../' + moduleRoot.root.location);

var cert          = require(path.join(webinosRoot, dependencies.pzp.location, 'lib/session_certificate.js'));
var log           = require(path.join(webinosRoot, dependencies.pzp.location, 'lib/session_common.js')).debug;
var common        = require(path.join(webinosRoot, dependencies.pzp.location, 'lib/session_common.js'));

// Please change both ports 
configure.pzhPort    = 8000; // used by PZP
configure.farmPort   = 8000; // used by farm when starting

// PZH webserver uses these ports 
configure.httpServerPort = 8900;
configure.webServerPort  = 9000;

//PZP webserver uses these ports
configure.pzpHttpServerPort = 8081;
configure.pzpWebServerPort  = 8080;

// Default webinos services available when no configuration exists yet
configure.pzhDefaultServices = [
    {name: "context", params: {}},
    {name: "events", params: {}},
    {name: "get42", params: {}}
]

/**
* @descripton Checks for master certificate, if certificate is not found it calls generating certificate function defined in certificate manager. This function is crypto sensitive.
* @param {function} callback It is callback function that is invoked after checking/creating certificates
*/
configure.setConfiguration = function (name, type, url, callback) {
	var webinosDemo = common.webinosConfigPath();

	if (typeof callback !== "function") {
		log('ERROR', '[CONFIG] Callback function is not defined');
		callback("undefined");
		return;
	}

	if (type !== 'PzhFarm' && type !== 'Pzh' && type !== 'Pzp') {
		log('ERROR', '[CONFIG] Wrong type is used');
		callback("undefined");
		return;
	}
	
	if (name === '' && (type === 'Pzp' || type === 'PzhFarm')){
		name = os.hostname() + '_'+ type; //devicename_type
	}
	
	fs.readFile(( webinosDemo+'/config/'+ name +'.json'), function(err, data) {
		if ( err && err.code=== 'ENOENT' ) {
			// CREATE NEW CONFIGURATION
			var config = createConfigStructure(name, type);
			
			config.details.name       = name;
			config.details.type       = type;
			config.details.servername = url;
			// This self signed certificate is for getting connection certificate CSR.
			try {  // From this certificate generated only csr is used
				cert.selfSigned(config, config.details.type, function(status, selfSignErr, conn_key, conn_cert, csr ) {
					if(status === 'certGenerated') {
						configure.storeKey(config.conn.key_id, conn_key);
						log('INFO', '[CONFIG] Generated CONN Certificates');
						if (type !== 'Pzp') {
							// This self signed certificate is  master certificate / CA
							selfSignedMasterCert(config, function(config_master){
								// Sign connection certifcate
								configure.signedCert(csr, config_master, null, 1, function(config_signed) { // PZH CONN CERT 1
									callback(config_signed, conn_key);
								});
							});
						} else {
							// PZP will only generate only 1 certificate
							try{
								// Used for initial connection, will be replaced by cert received from PZH
								config.conn.cert = conn_cert.cert;
								configure.storeConfig(config, function() {
									callback(config, conn_key, csr);
								});
							} catch (err) {
								log('ERROR', '[CONFIG] Error storing key in key store '+ err);
								return;
							}
						}
					} else {
						log('ERROR', '[CONFIG] Error Generating Self Signed Cert: ');
						callback("undefined");
					}
				});
			} catch (err) {
				log('ERROR', '[CONFIG] Error in generating certificates' + err);
				callback("undefined");
			}
		} else { // When configuration already exists, just load configuration file
			var configData = data.toString('utf8');
			config = JSON.parse(configData);
			if (config.master.cert === '' ){ 
				log('INFO', '[CONFIG] Regenerate PZP certificate as it failed getting certificate from PZH');
				cert.selfSigned(config, config.details.type, function(status, selfSignErr, conn_key, conn_cert, csr ) {
					if(status === 'certGenerated') {
						configure.storeKey(config.conn.key_id, conn_key);
						config.conn.cert = conn_cert.cert;
						configure.storeConfig(config, function() {
							callback(config, conn_key, csr);
						});
					}
				});
			} else {
				configure.fetchKey(config.conn.key_id, function(conn_key){
					callback(config, conn_key);
				});
			}
		}
		
	});

};

configure.createDirectoryStructure = function (callback) {
	var webinosDemo = common.webinosConfigPath();
	try {
		// Main webinos directory
		fs.readdir ( webinosDemo, function(err) {
			if ( err && err.code === 'ENOENT' ) {
				fs.mkdirSync( webinosDemo,'0700');
			}
		});
		// Configuration directory, which holds information about certificate, ports, openid details
		fs.readdir ( webinosDemo+'/config', function(err) {
			if ( err && err.code=== 'ENOENT' ) {
				fs.mkdirSync( webinosDemo +'/config','0700');
			}
		});
		// logs
		fs.readdir ( webinosDemo+'/logs', function(err) {
			if ( err && err.code=== 'ENOENT' ) {
				fs.mkdirSync( webinosDemo +'/logs','0700');
			}
		});
		// keys
		fs.readdir ( webinosDemo+'/keys', function(err) {
			if ( err && err.code=== 'ENOENT' ) {
				fs.mkdirSync( webinosDemo +'/keys','0700');
			}
		});

	} catch (err){
		log('ERROR', '[CONFIG] Error setting default Webinos Directories' + err.code);


	}
}

configure.storeConfig = function (config, callback) {
	var webinosDemo = common.webinosConfigPath();
	if (typeof config!== "undefined") {
		var name = config.details.name;
		fs.writeFile((webinosDemo+ '/config/'+name+'.json'), JSON.stringify(config, null, " "), function(err) {
			if(err) {
				callback(false);
				log('ERROR', '[CONFIG] Error saving configuration file @@ '+name);
			} else {
				callback(true);
				log('INFO', '[CONFIG] Saved configuration file @@ ' + name);
			}
		});
	}
}
// TODO: Put this keys in secure storage ..
configure.storeKey= function (key_id, value) {
	var webinosDemo = common.webinosConfigPath();
	fs.writeFile((webinosDemo+ '/keys/'+key_id), value, function(err) {
		if(err) {
			log('ERROR', '[CONFIG] Error saving key ' + err);
		} else {
			log('INFO', '[CONFIG] Saved key file @@ ' +key_id);
		}

	});

}
configure.fetchKey= function (key_id, callback) {
	var webinosDemo = common.webinosConfigPath();
	fs.readFile((webinosDemo+ '/keys/'+key_id), function(err, data) {
		if(err) {
			log('ERROR', '[CONFIG] Error saving key ' + err);
			callback(null);
		} else {
			log('INFO', '[CONFIG] Fetched key file @@ '+ key_id);
			callback(data.toString());
		}

	});

}

configure.signedCert = function (csr, config, name, type, callback) {
	try {
		configure.fetchKey(config.master.key_id, function(master_key){
			// connection certificate signed by master certificate
			cert.signRequest(csr, master_key,  config.master.cert, type, config.details.servername, function(result, signed_cert) {
				if(result === 'certSigned') {
					log('INFO', '[CONFIG] Generated Signed Certificate by CA');
					try {
						if(type === 1 || type === 0) { // PZH
							config.conn.cert = signed_cert; // Signed connection certificate
						} else {
							config.signedCert[name] = signed_cert;
						}
						
						// Update with the signed certificate
						configure.storeConfig(config, function() {
							callback(config);
						});
					} catch (err1) {
						log('ERROR','[CONFIG] Error setting paramerters' + err1) ;
						callback("undefined");
						return;
					}
				}
			});
		});
	} catch (err){
		log('ERROR', '[CONFIG] Error in generating signed certificate by CA' + err);
		callback("undefined");	
	}
};

function createConfigStructure (name, type) {
	var config = {};
	if (type === 'Pzh') {
		config.conn        = { key_id: name+'_conn_key',   cert:''};
		config.master      = { key_id: name+'_master_key', cert:'', crl:'' };
		config.signedCert  = {};
		config.revokedCert = {};
		config.otherCert   = {};
	} else if (type === 'PzhFarm') {
		config.conn        = { key_id: name+'_conn_key',   cert:''};
		config.master      = { key_id: name+'_master_key', cert:''} ;
		config.webServer   = { key_id: name+'_ws_key',     cert:''} ;
		config.pzhs        = {}; //contents: '', modules:''
	} else if (type === 'Pzp' ) {
		config.conn        = { key_id: name+'_conn_key', cert:''};
		config.master      = { cert:'', crl:'' };
	};
	config.details = {email: '', username: '', country: '', connid: '', image: '', servername:'', type: '', name: ''};
	return config;
}

function selfSignedMasterCert(config, callback){
	try {
		cert.selfSigned( config, config.details.type+'CA', function(result, selfSignErr, master_key, master_cert) {
			if(result === 'certGenerated') {
				log('INFO', '[CONFIG] Generated CA Certificate');
				// Store all master certificate information
				config.master.cert = master_cert.cert;
				config.master.crl  = master_cert.crl;
				configure.storeKey(config.master.key_id, master_key);
				configure.storeConfig(config, function() {
					callback(config);
				});
			} else {
				log('ERROR', 'Error in genrarting certificate for ' + config.name )
			}
		});
	} catch (err) {
		log('ERROR', '[CONFIG] Error in generating master self signed certificate ' + err);
		callback("undefined");
	}
}