var express = require('express');
var bodyParser = require('body-parser');
var gpio = require('rpi-gpio');
const exec = require('child_process').exec;
var yaml = require('js-yaml');
var fs = require('fs');

/*
Forever Command:
forever -o /var/log/relay_operations/stdout.log start /home/pi/workspace.nodejs/relay_control/server/server.js >> /var/log/relay_operations/output.log 2>>/var/log/relay_operations/error.log
*/

/*
// //////////// //
// TODO SECTION //
// //////////// //

create website for validating the key. React...


creating the auth key, when scrubbing the auth key, ensure memory leak does not occur.
 need to set a max size and remove oldest enties
 need to remove expired entries (already remove entries from same host)



*/


// //////////////// //
// GLOBAL VARIABLES //
// //////////////// //

var app = express();
var authorize_client = [];

// ///////////////// //
// LOGGING CONSTANTS //
// ///////////////// //

var CONFIG_LOCATION = __dirname + '/../config';
var LOG_LOCATION = '/var/log/diyapi';
var GPIO_CONFIG_FILE_YAML = CONFIG_LOCATION + '/gpio.yaml';
var API_KEY_FILE = CONFIG_LOCATION + '/apikey';
var SYS_LOG_FILE = LOG_LOCATION + '/system.log';
var SYS_LOG_FILE_JSON = LOG_LOCATION + '/system.json';
var OPS_LOG_FILE = LOG_LOCATION + '/operations.log';
var OPS_LOG_FILE_JSON = LOG_LOCATION +'/operations.json';

// ////////////////////// //
// LOGGING TYPE CONSTANTS //
// ////////////////////// //

var SEV_DEBUG = 'DEBUG';
var SEV_INFO = 'INFO';
var SEV_WARN = 'WARN';
var SEV_ERR = 'ERR';

var LOG_TYPE_SYS = 'SYS';
var LOG_TYPE_OPER = 'OPER';

var AUTH_STATUS_EXPIRE_TIME_MINUTES = 2;
var AUTH_SCRUB_TIMER_MILLISECONDS = 14400000;
var AUTH_STATUS_CREATED = 'created';
var AUTH_STATUS_AUTH = 'authorized';
var AUTH_STATUS_EXPIRED = 'expired';
var AUTH_STATUS_INVALID = 'invalid';


// /////////////////
// INITIALIZATION //
// /////////////////

//var pins = [ 3, 5, 7, 11, 12, 13, 15, 16 ];
//var pins_length = pins.length;

/*
* Initialization Section
* Anything that need to be initialized whe the server is started
*  > Loop through the configured pins and set them up for execution.
*  > This will se the state to OFF or True.
TODO:
parse the yaml file and populate the pins array < error if there is a problem.
create logging file, if it doesn't exist < /var/log/diyapi
start logging to a file
create a json logging format for system
*/

bootstrap();
app.set('port', process.env.PORT || 3000);  // Set the environment variable for webserver port
app.use(bodyParser.json());  // expect JSON format

// ///////// //
// FUNCTIONS //
// ////////////

function bootstrap() {

    // if (!fs.existsSync(CONFIG_LOCATION)) {
    //   fs.mkdirSync(CONFIG_LOCATION);
    // }

    try {

      writeSystemLog(LOG_TYPE_SYS, SEV_INFO, 'Server Starting.');

      if (!fs.existsSync(LOG_LOCATION)) {
        fs.mkdirSync(LOG_LOCATION);
      }

      if (!fs.existsSync(API_KEY_FILE)) {
        writeSystemLog(LOG_TYPE_SYS, SEV_INFO, "Generated the api key.");
        var newApiKey = generateApiKey(); 
        writeApiKeyFile(newApiKey); 
      }

      /*
      if (!fs.existsSync(CONFIG_LOCATION)) {
        writeSystemLog(LOG_TYPE_SYS, SEV_ERR, "Configuration files not present. Is this the first time?");
        fs.mkdirSync(CONFIG_LOCATION);
        writeSystemLog(LOG_TYPE_SYS, SEV_ERR, "Created config directory.");
        // fs.closeSync(fs.openSync(GPIO_CONFIG_FILE_YAML, 'w'));
        fs.createReadStream(__dirname + '/../gpio.yaml.example').pipe(fs.createWriteStream(GPIO_CONFIG_FILE_YAML));
        // fs.copyFileSync( __dirname + "/../gpio.yaml.example", GPIO_CONFIG_FILE_YAML);
        writeSystemLog(LOG_TYPE_SYS, SEV_ERR, "Copied the template gpio config file. Please edit this file and restart service.");
        var newApiKey = generateApiKey();
        writeApiKeyFile(newApiKey);
        writeSystemLog(LOG_TYPE_SYS, SEV_ERR, "Generated the api key.");     
        // fs.mkdirSync(CONFIG_LOCATION);
      }
      */

      initialize_gpio();
      writeSystemLog(LOG_TYPE_SYS, SEV_INFO, 'Initialization Complete.');
    
  } catch (err) {
    writeSystemLog(LOG_TYPE_SYS, SEV_ERR , err);

  }

}

function initialize_gpio() {

  var pins = [];
  var config_json = convertYamlToJson();
  
  for (var item in config_json) {
    pins.push(item);
  }
  
  var pins_length = pins.length;
  
  for (var i = 0; i < pins_length; i++) {
    var value = true;
    writeSystemLog(LOG_TYPE_SYS, SEV_INFO, 'Initializing GPIO setup, Resetting pin: ' + pins[i]);
    gpio.setup(pins[i], gpio.DIR_IN, function(err) {
      //console.log(err);
    });
  }

}

function writeSystemLog(type, severity, message) {
  var timestamp = new Date();
  var log_entry = timestamp + " | " + type + " | " + severity + " | " + message + "\n";

  fs.appendFile(SYS_LOG_FILE, log_entry, function (err) {
    if (err) throw err;
  });
  console.log(message);
}

function convertYamlToJson() {
  return yaml.load(fs.readFileSync(GPIO_CONFIG_FILE_YAML, {encoding: 'utf-8'}));
}

function executeShellCommand(cmd, callback) {
  exec(cmd, (err, stdout, stderr) => {
    if (err !== null)
      callback(err);
    callback(null,stdout);
  });
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateApiKey() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }); 
}

function generateAuthCode() {
  return 'xxyx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


/*
function writeApiKeyFile(apikey) {

  fs.writeFile(API_KEY_FILE, apikey, function(err) {
    if(err) {
      console.log(err);
    } else {
      executeShellCommand('chmod 600 ' + API_KEY_FILE, function(err, out) { 
        var message = 'writeApiKeyFile, Generated a new api key.';
        writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
      });
    }
  });
}
*/
function writeApiKeyFile(apikey) {

  fs.writeFile(API_KEY_FILE, apikey);
  executeShellCommand('chmod 600 ' + API_KEY_FILE, function(err, out) { 
    var message = 'writeApiKeyFile, Generated a new api key.';
    writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
  });
}

function readApiKey() {
  result = fs.readFileSync(API_KEY_FILE, {encoding: 'utf-8'});
  return result;
}

function checkApiKey(apikey) {

  var secure_api_key = readApiKey();

  if (apikey == secure_api_key) {
    return true;
  } else {
    return false;
  }

}

function validateApiKey(apikey) {

    // Check to see if the apikey was in the uri.
    if (apikey) {
  
      // Compare the apikey sent to the configured apikey.
      var api_check_result = checkApiKey(apikey);
  
      // If the apikey sent matches the configured apikey.
      if (api_check_result) {
  
        // LOGIC //
        // ///// //
  
        return true;
  
        // END LOGIC //
        // ///////// //
  
        
      } else {
        // If the apikey does not match.
        // res.status(401).send("");
        var message = 'GET /schedule SRC_IP:' + req.connection.remoteAddress + ', UNAUTHORIZED: Wrong API Key.';
        writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
        return false;
      }
    } else {
      // If there is not apikey sent in the querystring.
      // res.status(401).send("");
      var message = 'GET /schedule SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: No API Key.';
      writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
      return false;
    }
}

function writeAuthCode(code, ipaddress, createTime, expireTime) {

  authorize_client.push({
    auth_code: code,
    ip_address: ipaddress,
    create_time: createTime,
    expire_time: expireTime,
    status: AUTH_STATUS_CREATED
  });

  writeSystemLog(LOG_TYPE_OPER, SEV_INFO, "Auth Code Created.");
  writeSystemLog(LOG_TYPE_OPER, SEV_INFO, JSON.stringify(authorize_client));
}

function readAuthCode(code, ipaddress) {

    writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Auth code read request, " + code + ", " + ipaddress);

  for (var item in authorize_client) {
    
    if (code == authorize_client[item].auth_code && ipaddress == authorize_client[item].ip_address) {
      writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Found a match, " + code);
      return authorize_client[item].status;
    } 
  }
}

function authorizeAuthCode(code, ipaddress) {

  var current_time = new Date();
  writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Auth code authorization request, " + code + ", " + ipaddress);

  for (var item in authorize_client) {
    
    if (code == authorize_client[item].auth_code && authorize_client[item].expire_time > current_time) {
      writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Authorizing Key, " + code);
      authorize_client[item].status = AUTH_STATUS_AUTH;

    } 
  }
}

function scrubAuthCodeDuplicateIP(ipaddress) {

  for (var item in authorize_client) {

    // Marking keys.
    
    if (authorize_client[item].ip_address == ipaddress && 
        authorize_client[item].status != AUTH_STATUS_AUTH) {
      writeSystemLog(LOG_TYPE_OPER, SEV_INFO, "Expired Key, duplicate IP Address, " + authorize_client[item].auth_code);
      // authorize_client[item].status = AUTH_STATUS_EXPIRED;
      authorize_client.splice(item, 1);
    }

    // Scrubbing keys.
    /*
    if (authorize_client[item].status == AUTH_STATUS_EXPIRED) {
      writeSystemLog(LOG_TYPE_OPER, SEV_INFO, "Scrubbing Keys, " + authorize_client[item].auth_code);
      authorize_client.splice(item, 1);
    }
    */
  }
}

function scrubAuthCodeSystem() {

  for (var item in authorize_client) {

    var current_time = new Date();

    if (authorize_client[item].expire_time < current_time && 
        authorize_client[item].status != AUTH_STATUS_AUTH) {
      writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Expired key, time expiration, " + authorize_client[item].auth_code);
      authorize_client[item].status = AUTH_STATUS_EXPIRED;
      //authorize_client.splice(item, 1);
    }

    // Scrubbing keys.
    if (authorize_client[item].status == AUTH_STATUS_EXPIRED) {
      writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Scrubbing Keys, " + authorize_client[item].auth_code);
      authorize_client.splice(item, 1);
    }
  }

}

function parseTime(value) {
  // Get AM or PM
  var time_split_01 = value.split(" ");
  // Split the time.
  var time_split_02 = time_split_01[0].split(":");
  // Convert to int
  for( x=0; x<time_split_02.length; x++) {
    time_split_02[x] = +time_split_02[x];
  }
  // add 12 if PM, 12-hour clock.
  if (time_split_01[1] == "PM") {
    time_split_02[0] += 12;
  }

  return time_split_02;
}

// ///////////////////////////////////// //
// TIMER FUNCTIONS TO PERFORM OPERATIONS //
// ///////////////////////////////////// //

function SysScrubAuthCodes() {
  writeSystemLog(LOG_TYPE_SYS, SEV_DEBUG, "Service Scrubbing Auth Codes Executing.")

  if (authorize_client) {
    scrubAuthCodeSystem();
    writeSystemLog(LOG_TYPE_OPER, SEV_INFO, JSON.stringify(authorize_client));
  }

}
setInterval(SysScrubAuthCodes, AUTH_SCRUB_TIMER_MILLISECONDS);


// /////////// //
// API LIBRARY //
// /////////// //

/*
// PLACEHOLDER FOR REACTJS PAGE
// TODO: FUTURE

app.use("/css", express.static(__dirname + '/../dist/css'));
app.use("/scripts", express.static(__dirname + '/../dist/scripts'));
app.use("/images", express.static(__dirname + '/../dist/images'));

app.get('/', function(req, res){
  //res.render('./../dist/index.html', {});
  res.sendFile('index.html', {root: __dirname + '/../dist/'});
});
*/

// ///////////////////////// //
// CONFIGURATION MASTER APIs //
// ///////////////////////// //

// ** API SECURITY IMPLEMENTED
// TODO: Better error checking to guide the user if they mistype the apikey.
app.get('/conf', function(req, res) {

    // Fetch the apikey query string from uri.
    var apikey = req.query.apikey;

    // Check to see if the apikey was in the uri.
    if (apikey) {
  
      // If the apikey sent matches the configured apikey.
      if (checkApiKey(apikey)) {
  
        // LOGIC //
        // ///// //
  
        result = yaml.load(fs.readFileSync(GPIO_CONFIG_FILE_YAML, {encoding: 'utf-8'}));
        res.status(200).send({result});
  
        // END LOGIC //
        // ///////// //
  
        
      } else {
        // If the apikey does not match.
        res.status(401).send("");
        var message = 'GET /conf, SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: Wrong API Key.';
        writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
      }
    } else {
      // If there is not apikey sent in the querystring.
      res.status(401).send("");
      var message = 'GET /conf, SRC_IP: ' + req.connection.remoteAddress + ' | UNAUTHORIZED: No API Key.';
      writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
    }

});

// /////////////////////// //
// API KEY MANAGEMENT APIs //
// /////////////////////// //

// displays the apikey, will be disabled
app.get('/key', function(req, res) {

  var apikey = readApiKey();
  res.status(200).send(apikey);

});

// ** API SECURITY IMPLEMENTED
app.get('/key/generate', function(req, res) {
  
  // Fetch the apikey query string from uri.
  var apikey = req.query.apikey;

  // Check to see if the apikey was in the uri.
  if (apikey) {

    // If the apikey sent matches the configured apikey.
    if (checkApiKey(apikey)) {

      // LOGIC //
      // ///// //

      var newApiKey = generateApiKey();
      var results = [];
      writeApiKeyFile(newApiKey);
      var message = 'GET /key/generate, SRC_IP: ' + req.connection.remoteAddress + ', Generated a new api key.';
      writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
      results.push({apikey: newApiKey});
      res.status(200).send({results});

      // END LOGIC //
      // ///////// //

      
    } else {
      // If the apikey does not match.
      res.status(401).send("");
      var message = 'GET /key/generate, SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: Wrong API Key.';
      writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
    }
  } else {
    // If there is not apikey sent in the querystring.
    res.status(401).send("");
    var message = 'GET /key/generate, SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: No API Key.';
    writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
  }
  
});

// ///////////////////////// //
// DEVICE AUTHORIZATION APIs //
// remote device makes a request for auth code
// remote device makes api calls to check the status
// user goes to the local device and enters code
// when the status is authorized, the remote device receives the apikey
// ///////////////////////// //

app.get('/key/auth/request', function (req, res) {

  var auth_code = generateAuthCode();
  var create_time = new Date();
  var expire_time = new Date(create_time.getTime() + AUTH_STATUS_EXPIRE_TIME_MINUTES*60000);
  var ip_address = req.connection.remoteAddress;
  var results = [];

  scrubAuthCodeDuplicateIP(ip_address);
  writeAuthCode(auth_code, ip_address, create_time, expire_time);

  results.push({authcode: auth_code,
    timestamp:create_time,
    expire_time: expire_time
  });

  res.status(200).send({results});

});

app.get('/key/auth/status/:code', function(req, res) {

  var code = req.params.code;
  var ip_address = req.connection.remoteAddress;
  var status = readAuthCode(code, ip_address);
  var results = [];

  if (!status) {
    status = AUTH_STATUS_INVALID;
    
  } 

  if (status == AUTH_STATUS_AUTH) {

    // writeApiKeyFile(LOG_TYPE_SYS, SEV_DEBUG, "Auth code authorized, " + code + ", " + ip_address);

    var apikey = readApiKey();

    results.push({
      auth_status: status,
      apikey: apikey
    })

  } else {

    results.push({
      auth_status: status
    })

  }

  writeSystemLog(LOG_TYPE_OPER, SEV_DEBUG, "Auth code, " + status + ", " + code + ", " + ip_address);
  res.status(200).send({results});

});

app.get('/key/auth/register/:code', function(req, res) {

  var code = req.params.code;
  var ip_address = req.connection.remoteAddress;
  var results = [];

  authorizeAuthCode(code, ip_address);

  results.push({
    auth_code: code,
    auth_status: AUTH_STATUS_AUTH,
  })
  res.status(200).send({results});

});


/*
// TEMPLATE CODE FOR APIKEY SECURITY ON APIs.
// ALWAYS KEEP COMMENTED FOR SECURITY REASONS.

app.get('/key/test', function(req, res) {
  
  // Fetch the apikey query string from uri.
  var apikey = req.query.apikey;

  // Check to see if the apikey was in the uri.
  if (apikey) {

    // If the apikey sent matches the configured apikey.
    if (checkApiKey(apikey)) {

      // LOGIC //
      // ///// //

      res.status(200).send("match");

      // END LOGIC //
      // ///////// //

      
    } else {
      // If the apikey does not match.
      res.status(401).send("");
      var message = 'GET | | DST: ' + req.connection.remoteAddress + ' | UNAUTHORIZED: Wrong API Key.';
      writeSystemLog(message);
    }
  } else {
    // If there is not apikey sent in the querystring.
    res.status(401).send("");
    var message = 'GET | | DST: ' + req.connection.remoteAddress + ' | UNAUTHORIZED: No API Key.';
    writeSystemLog(message);
  }

});
*/

// ///////// //
// GPIO APIs //
// ///////// //

app.get('/pin/:pin', function(req, res){
  var pin = req.params.pin;

   gpio.read(pin, function(err, value) {
        var message = 'GET /pin/:pin, SRC_IP: ' + req.connection.remoteAddress + ', pin: ' + pin + ', current value: ' + value;
        res.status(200).send({ values: [ { pin: pin, state: value } ] });
        writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
    });

});

app.put('/pin/:pin', function(req, res) {
  // PAYLOAD { value : true OFF || false ON } to change the state of the GPIO
  var pin = req.params.pin;
  var value = JSON.parse(req.body.value);

  gpio.setup(pin, gpio.DIR_OUT, function() {
    gpio.write(pin, value, function(err) {
      var message = 'PUT /pin/:pin SRC_IP: ' + req.connection.remoteAddress + ', pin: ' + pin + ', setting value to: ' + value;
      res.sendStatus(200);
      writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
    });
  });
});

// ///////////// //
// SCHEDULE APIs //
// ///////////// //

// ** API SECURITY IMPLEMENTED
app.get('/schedule', function(req, res) {

  // Fetch the apikey query string from uri.
  var apikey = req.query.apikey;

  // Check to see if the apikey was in the uri.
  if (apikey) {

    // If the apikey sent matches the configured apikey.
    if (checkApiKey(apikey)) {
      
      // LOGIC //
      // ///// //

      var results = [];

      executeShellCommand('crontab -l | grep -F "relay_pin_control.py"', function(err, out) {
  
        try {
  
          var out_lines = out.split("\n");
          var suffix = "AM";
  
          for ( x = 0; x < out_lines.length - 1; x++) {
  
            var split_out_lines = out_lines[x].split(" ");
  
            if (parseInt(split_out_lines[1]) > 12) {
              var hour = parseInt(split_out_lines[1]) - 12;
              suffix = "PM";
            } else {
              var hour = split_out_lines[1];
            }
  
            results.push({ id: split_out_lines[9].replace("#",""),
                           gpio: split_out_lines[7],
                           function: split_out_lines[8],
                           time: hour + ":" + split_out_lines[0] + " " + suffix });
          }
  
          res.status(200).send({ results });
  
          var message = 'GET /schedule, SRC_IP: ' + req.connection.remoteAddress;
          writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);
  
        } catch(err) {  
          var message = 'GET /schedule, SRC_IP: ' + req.connection.remoteAddress + ', ERROR: ' + err;
          writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
        }
  
      });
      
      // END LOGIC //
      // ///////// //

    } else {
      // If the apikey does not match.
      res.status(401).send("");
      var message = 'GET /schedule, SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: Wrong API Key.';
      writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
    }
  } else {
    // If there is not apikey sent in the querystring.
    res.status(401).send("");
    var message = 'GET /schedule, SRC_IP: ' + req.connection.remoteAddress + ', UNAUTHORIZED: No API Key.';
    writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
  }

});

app.get('/schedule/:pin', function(req, res) {
  var pin = req.params.pin;

  var results = [];

    executeShellCommand('crontab -l | grep -F "relay_pin_control.py ' + pin + '"', function(err, out) {

      try {

        var out_lines = out.split("\n");
        var suffix = "AM";

        for ( x = 0; x < out_lines.length - 1; x++) {

          var split_out_lines = out_lines[x].split(" ");

          if (parseInt(split_out_lines[1]) > 12) {
            var hour = parseInt(split_out_lines[1]) - 12;
            suffix = "PM";
          } else {
            var hour = split_out_lines[1];
          }

          results.push({ id: split_out_lines[9].replace("#",""),
                         function: split_out_lines[8],
                         time: hour + ":" + split_out_lines[0] + " " + suffix });
        }

        var message = 'GET /schedule/:pin, SRC_IP: ' + req.connection.remoteAddress;
        writeSystemLog(LOG_TYPE_OPER, SEV_INFO, message);

        res.status(200).send({ results });

      } catch(err) {  
        var message = 'GET /schedule, SRC_IP: ' + req.connection.remoteAddress + ', ERROR: ' + err;
        writeSystemLog(LOG_TYPE_OPER, SEV_ERR, message);
      }

    });
});






/* ***********************************************************
*  * WORKING APIs
*  * THESE APIs ARE IN PROCESS AND NOT USED IN ANY APPLICATION
   *********************************************************** */


app.get('/diag', function(req, res) {
  // Run diagnostic commands and return the results in JSON format for consumption.
  var results = [];
  // Get the tempurature of the raspberry pi.
  // COMMAND: /opt/vc/bin/vcgencmd measure_temp
  executeShellCommand('/opt/vc/bin/vcgencmd measure_temp', function(err, out) {
    results.push({temp: out});

    executeShellCommand('date', function(err,out) {
      results.push({date: out});

      executeShellCommand('df -h | grep /dev/root', function(err,out) {
        results.push({disk: out});

        executeShellCommand('ifconfig wlan0', function(err,out) {
          results.push({network: out});

          res.status(200).send({ values: results });
        });
      });
    });
  });
});

//To add a job to crontab:
// (crontab -u mobman -l ; echo "*/5 * * * * perl /home/mobman/test.pl") | crontab -u mobman -
//To remove a job from crontab:
// crontab -u mobman -l | grep -v 'perl /home/mobman/test.pl'  | crontab -u mobman -
//Remove everything from crontab:
// crontab -r

app.put('/schedule/create/:pin', function(req, res) {
  //curl -i -X PUT -H 'Content-Type: application/json' -d '{ "ontime": "10:30 AM", "offtime": "11:00 AM" }' http://10.1.11.112:3000/schedule/create/3

  var pin = req.params.pin;
  //console.log(req.body);

  var ontime = req.body.ontime;
  var offtime = req.body.offtime;
  //console.log("Parameters: PIN: " + pin + ", ONTIME: " + ontime + ", OFFTIME: " + offtime);

  // Parse ontime and offtime, get hour and minute.
  // Might change depending on android time picker.
  var ontime_array = parseTime(ontime);
  var offtime_array = parseTime(offtime);
  var uuid = uuidv4();
  //console.log("ONTIME_PARSED: hour: " + ontime_array[0] + ', minute: ' + ontime_array[1]);
  //console.log("OFFTIME_PARSED: hour: " + offtime_array[0] + ', minute: ' + offtime_array[1]);

  // Create 2 cron jobs, one for ontime and one for offtime
  var ontime_cron = '(crontab -l ; echo "' + ontime_array[1] + ' ' + ontime_array[0] +
                    ' * * * python /home/pi/workspace.python/relay_control/relay_pin_control.py ' + pin + ' "ON" #' +
                    uuid +'") | crontab -';

  var offtime_cron = '(crontab -l ; echo "' + offtime_array[1] + ' ' + offtime_array[0] +
                    ' * * * python /home/pi/workspace.python/relay_control/relay_pin_control.py ' + pin + ' "OFF" #' +
                    uuid + '") | crontab -';

  executeShellCommand(ontime_cron, function(err, out) {
    executeShellCommand(offtime_cron, function(err, out) {

        console.log(" > Schedule_Created // Pin: " + pin + " // On Time: " + ontime + " // Off Time: " + offtime);
        console.log(" >> Command: " + ontime_cron);
        console.log(" >> Command: " + offtime_cron);

        res.sendStatus(200);
    });
  });
});

//curl -i -X PUT -H 'Content-Type: application/json' -d '{ "ontime": "10:30 AM", "offtime": "11:00 AM" }' http://10.1.11.112:3000/schedule/create/3
app.put('/schedule/delete/:pin', function(req, res) {
  // change this to read the uuid and delete all with the uuid


  var pin = req.params.pin;
  //console.log(req.body);

  var ontime = req.body.ontime;
  var offtime = req.body.offtime;
  //console.log("Parameters: PIN: " + pin + ", ONTIME: " + ontime + ", OFFTIME: " + offtime);

  // Parse ontime and offtime, get hour and minute.
  // Might change depending on android time picker.
  var ontime_array = parseTime(ontime);
  var offtime_array = parseTime(offtime);
  //console.log("ONTIME_PARSED: hour: " + ontime_array[0] + ', minute: ' + ontime_array[1]);
  //console.log("OFFTIME_PARSED: hour: " + offtime_array[0] + ', minute: ' + offtime_array[1]);

// crontab -u mobman -l | grep -v 'perl /home/mobman/test.pl'  | crontab -u mobman -
  // Create 2 cron jobs, one for ontime and one for offtime

  var ontime_cron = 'crontab -l | grep -vF "' + ontime_array[1] + ' ' + ontime_array[0] +
                    ' * * * python /home/pi/workspace.python/relay_control/relay_pin_control.py ' + pin + ' ON" | crontab -';

  var offtime_cron = 'crontab -l | grep -vF "' + offtime_array[1] + ' ' + offtime_array[0] +
                     ' * * * python /home/pi/workspace.python/relay_control/relay_pin_control.py ' + pin + ' OFF" | crontab -';

  executeShellCommand(ontime_cron, function(err, out) {
    executeShellCommand(offtime_cron, function(err, out) {

        console.log(" > Schedule_Deleted // Pin: " + pin + " // On Time: " + ontime + " // Off Time: " + offtime);
        console.log(" >> Command: " + ontime_cron);
        console.log(" >> Command: " + offtime_cron);

        res.sendStatus(200);
    });
  });
});




/*
* Start the Web Server
*/

var server = app.listen(app.get('port'), function() {
  writeSystemLog(LOG_TYPE_SYS, SEV_INFO, 'Listening on port, ' + server.address().port);
});
