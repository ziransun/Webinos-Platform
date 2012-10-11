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
* Copyright 2012 Ziran Sun Samsung Electronics(UK) Ltd
* 
******************************************************************************/

if (typeof webinos === "undefined") { webinos = {}; }
if (!webinos.discovery) { webinos.discovery = {}; }

//android

var disc = require('bridge').load('org.webinos.impl.discovery.DiscoveryHRMImpl', this);

/**
 * Find Bluetooth Heart Rate Monitor device
 * @param serviceType Service type.
 * @param onFound Success callback.
 */

HRMfindservice = function(serviceType,onFound){

  try 
  {
    disc.findServices(serviceType, function(service){onFound(service);}, null, null);
    //disc.findServices(servicetype, {onFound:onFound}, null, null);
  }
  catch(e) {
    console.log("discoveryTests - error: "+e.message);
  }
};

/**
 * Continuously call back with the current position.
 * @param args Array, first item being the options object, second item being an id.
 * @param successCB Success callback.
 * @param errorCB Error callback.
 * @param objectRef RPC object reference.
 */
function watchHRM (args, successCB, objectRef) {
    //var tint = 2000;
    var tint = 200;
	var params = args[0];
	if (params && params.maximumAge) tint = params.maximumAge;
	
	function getData() {
		// call getCurrentPosition and pass back the position
		/*getCurrentPosition(params, function(e) {
			var rpc = rpcHandler.createRPC(objectRef, 'onEvent', e);
			rpcHandler.executeRPC(rpc);
		}, errorCB); */
		
		HRMfindservice(params, function(e) {
			var rpc = rpcHandler.createRPC(objectRef, 'onEvent', e);
			rpcHandler.executeRPC(rpc);
		}
	}
	
	// initial position
	getData();

	var watchId = setInterval(function() {getData(); }, tint);
	
	watchIdTable[objectRef.rpcId] = watchId;
}


exports.HRMfindservice = HRMfindservice;
export.watchHRM = watchHRM;