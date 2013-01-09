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
var os = require("os");
var https = require('https');
var path        = require("path");
var webinos = require("find-dependencies")(__dirname);
var logger  = webinos.global.require(webinos.global.util.location, "lib/logging.js")(__filename) || console;

var PzpSIBAuth = function(_parent){

  if(os.platform().toLowerCase() == "android")  {
    try{
      this.bridge = require('bridge');
      this.QRencode = this.bridge.load('org.webinos.impl.QRImpl', this);
    } catch(e) {
      logger.error("Android QR encoder module could not be loaded!" + e);
    }
  }
  else {
    try { 
      this.QRencode = require("qrcode");
    } catch (e) {
      logger.error("Desktop node QR module could not be loaded!" + e);
    }
  }  
  
  /**
   * Create QR image using public key Hash
   * @param filepath. path for the public key certificate
   */
  this.createQRHash = function(infile, outfile, width, height, cb) {
    _parent.config.getKeyHash(infile, function(status, value){  
      if(status)
      {
        logger.log("get hash: " + value);
        //create QR code
        if(os.platform().toLowerCase() == "android") {
          try {
            var bridge = require('bridge');
            QRencode = bridge.load('org.webinos.impl.QRImpl', this);
            QRencode.enCode(value, width, height, outfile, function(outfile){
              cb(outfile);
          });
          
          /*  this.QRencode.enCode(value, width, height, outfile, function(outfile){
              onsuccess(outfile);
            }); */
          }
          catch(e) {
            logger.error("Android QRencode - error: "+e.message);
          }
        }
        else
        {
          logger.log("os is not android");
          try {
            var QRCode = require("qrcode");
            //this.QRencode.toDataURL(value, function(err,url) {  //why doesn't work?
            QRCode.toDataURL(value, function(err, value) {
              logger.log("created url: " + value);
              cb(err, value);
            });
          } catch (err) {
            logger.log("create QR failed: " + err); 
          } 
        } 
      }  
      else
        logger.log("get hash err: " + value); 
    });  
  };  
  
   /**
   * Compare hash from the scanned QR code with Hash stored locally
   * @param filepath. path for other party's public key certificate
   */
  this.checkQRHash = function(filename, hash, cb) {
    _parent.config.getKeyHash(filename, function(status, value){  
      if(status)
      {
        logger.log("hash passed over is: " + hash);
        
        logger.log("get hash of the other party: " + value)
        if(hash == value){
          logger.log("correct hash key");
          cb(true);
        }  
        else
        {
          logger.log("Wrong Hash Key");
          cb(false);
        }  
      }  
      else
      {
        logger.log("get hash err: " + value); 
      }  
    });  
  };
  
  this.exchangePzhCert = function(_parent, from, to, callback) {
    if(_parent.pzp_state.connectedPzp.hasOwnProperty(from))
      logger.log("PZP is already connected");
    else
    {
      var payload = {
	to  : to,
	from: from,
	payload: {
	  status: "pzpSendCert", message:{cert: _parent.config.cert.internal.master.cert}}
      },
      length = (JSON.stringify(payload).length % 2 === 0)? JSON.stringify(payload).length + 1: JSON.stringify(payload).length,
      
      options= {
	host: to.split('_')[0],   // localhost?
	port: 8080,               //port: config.userPref.ports.provider_webServer, 
	path: "/testbed/client.html?cmd=exchangeCert",   //path: "/main.html?cmd=transferCert",   
	method:"POST"//,
      };
      logger.log("pzp to pzp connection initiated");
      
      var req = https.request(options, function(res) {
	res.on('data', function(data) {
	  var parse = JSON.parse(data);
	  if (parse.payload && parse.payload.status === "pzpReceiveCert") {
	    logger.log("pzp to pzp receive response");
	    // store certificate 
	    if (!_parent.config.cert.external.hasOwnProperty(_msg.from)) {
	      _parent.config.cert.external[_msg.from] = { cert: _msg.payload.message.cert};
	      _parent.config.storeCertificate(_parent.config.cert.external,"external");
	    //calling connect other peers  
	    }
	  } 
	});
	req.on('error', function(err) {
	  logger.error(err);
	  if (callback) { callback({to: serverName, cmd: 'pzhPzh', payload: "pzh to pzh certificate exchange failed due to "+ err.message});}
	});
	req.write(JSON.stringify(payload));
	req.end();
      });   
    }
  }
}

  module.exports = PzpSIBAuth;
