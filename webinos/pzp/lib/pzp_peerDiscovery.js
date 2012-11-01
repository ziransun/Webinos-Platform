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
 * Copyright 2011 Ziran Sun, Samsung Electronics (UK) Ltd
 *******************************************************************************/
var mdns;
try {
  mdns = require('mdns');
} catch(e) {}

var bridge;
var mdnsAndroid;
try {
  bridge = require("bridge");
  mdnsAndroid = bridge.load('org.webinos.impl.discovery.DiscoveryMdnsImpl', this);
} catch(e) {}

var os      = require('os');
var webinos = require("find-dependencies")(__dirname);
var logger  = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || console;

/*
 * Pick element information from discovery results returned by mdns module. 
 * Applicable for Linux, Windows and Mac.  
 */
function getElement(service, element){
  var srv = JSON.stringify(service);
  var ret = null;
  if(element === 'name')
  {
    var nm = srv.split(element)[2];
    var index = nm.indexOf(",");
    //remove ""
    ret = nm.slice(3, index-1);
  }
  else if(element ==='addresses')
  {
    var el = srv.split(element)[1];
    var index = el.indexOf(",");
    ret = el.slice(4, index-2);
  }
  else
  {
    var el = srv.split(element)[1];
    var index = el.indexOf(",");
    ret = el.slice(2, index);
  }
  return ret;
}

var PzpPeerDiscovery = function(){};

/*
 * Advertise PZP with service type "_tcp_pzp". 
 * @param port. Port for advertisement. Use 4321 if not configured
 */
PzpPeerDiscovery.prototype.advertPzp = function(port) {
  if((os.type().toLowerCase() == "linux") && (os.platform().toLowerCase() == "android")) {
    logger.log("android-advert PZP");
      try {
        mdnsAndroid.advertServices("_pzp._tcp.local.");
        logger.log("advert Android PZP - END");
      }
      catch(e) {
        console.error("Android PZP advert - error: "+e.message);
      }
  }
  else {
    if(typeof mdns!=="undefined") {
      var ad = mdns.createAdvertisement(mdns.tcp('pzp'), port);
      logger.log("advert PZP - END");
      ad.start();
      ad.on('error', function(err) {
        logger.error("mdns advertisement  (" + err+")");
      });
    }
  }
};  

/*
 * Find other PZP Peers. Connect to the PZP if known.  
 * @param parent. PZP instance
 * @param tlsServerPort. TLS port for TLS peer connection
 * @param pzhId. PZH identity
 */
PzpPeerDiscovery.prototype.findPzp = function(parent, tlsServerPort, pzhId){
  if((os.type().toLowerCase() == "linux") && (os.platform().toLowerCase() == "android")) {
    function onFound(service){
      logger.log("Android-Mdns onFound callback: found service.");
      logger.log("Found" + service.deviceAddresses.length + " devices")
      
      for (var i=0;i<service.deviceAddresses.length;i++)
	  { 
		if((service.deviceNames[i] != "undefined") && (service.deviceAddresses[i] != "undefined")) {
			logger.log("comes to the loop:" + service.deviceAddresses[i]);
			var msg ={};
        	msg.name    = service.deviceNames[i];
        	msg.address = service.deviceAddresses[0];
        	msg.name    = pzhId + "/" + msg.name + "_Pzp";
        	msg.port    = tlsServerPort;
        	logger.log("found peer address:" + msg.address);
        	parent.connectPeer(msg);
		}
	  }
    }
    try{
      var servicetype = {
        api: "_pzp._tcp.local."
      };
      try {
        mdnsAndroid.findServices(servicetype, onFound);
        logger.log("Android-start finding other peers");
      }
      catch(e) {
        logger.error("Android findPzp - error: "+e.message);
      }
    }
    catch(e){
      logger.error("error: "+e.message);
    }
  }
  else
  {
    if(typeof mdns!=="undefined") {
      var browser = mdns.createBrowser(mdns.tcp('pzp')), msg ={};
      browser.on('error', function(err) {
        logger.error("browser error: (" + err+")");
      });
      browser.start();
      browser.on('serviceUp', function(service) {
        logger.log("Peer Discovery mdns service up");
        msg.name    = getElement(service, 'name');
        msg.port    = getElement(service, 'port');
        msg.address = getElement(service, 'addresses');
        
        logger.log("Found peer name:" + msg.name);
        logger.log("Found peer address:" + msg.address);

        logger.log("check mdns discovery list");
        var hostname = os.hostname();
        logger.log("own hostname is: " + hostname);
        
        if(msg.name !== os.hostname()) {
        
        logger.log("found other host");
          //Update connection - msg.name is machine name
          msg.name = pzhId + "/" + msg.name + "_Pzp";
          msg.port = tlsServerPort;
          parent.connectPeer(msg);
        }
      });
    }
  }  
}; 

module.exports = PzpPeerDiscovery;
