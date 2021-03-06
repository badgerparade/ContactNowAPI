/*
    Created by Christian Augustine
    ----
    Reporting API NodeJS client script
    
    YOU MUST SET THE FOLLOWING VARIABLES

    const  BASE_API_URL = "";// api-106.dxi.eu or api.contactnow.8x8.com/api Get this from https://github.com/8x8-dxi/ContactNowAPI#api-domains
    const _APIUSERNAME = ''; // your API Username
    const _APIPASSWORD = ''; // Your API Password

    startDatetimeStr = "2017-07-26 00:00:00", 
    stopDatetimeStr = "2017-11-14 23:59:59";
    
*/


    var request = require("request"),
        fs = require('fs'),
        path = require('path');
    
    const __TOKEN_FILE_PATH = path.join(__dirname, '../', 'token.json');
    
    // Initialisation
    const  BASE_API_URL = "api-106.dxi.eu";// Get this from https://github.com/8x8-dxi/ContactNowAPI#api-domains
    const _APIUSERNAME = ''; // Initialise your API Username
    const _APIPASSWORD = ''; // Your API Password
    // API end points
    const reportingEndpoint = 'https://'+BASE_API_URL+'/reporting.php';
    const ECNOWEndpoint = 'https://'+BASE_API_URL+'/ecnow.php';
    
    // Change the datetime
    var startDatetimeStr = "2017-07-26 00:00:00", 
        stopDatetimeStr = "2017-11-14 23:59:59";

    // Get the epoch time from the start and stop time
    var tstartObject = new Date(startDatetimeStr), 
        tStopObject = new Date(stopDatetimeStr),
        tstart = tstartObject.getTime()/1000,
        tstop = tStopObject.getTime()/1000,
        TOKEN=null;
    
    /**
     * Get a fresh token direct from ConatcNow
     * @param {type} callbackFunction
     * @returns {undefined}
     */
    var generateToken = function (callbackFunction){
        var options = {
            method: 'GET',
            url: 'https://'+BASE_API_URL+'/token.php',
            qs: {
                action: 'get',
                username: _APIUSERNAME,
                password: _APIPASSWORD
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                //throw new Error(error);
                return callbackFunction(true, error);
            }
            // You should really store the token on a local redis server to prevent
            // requesting token when it's not expired. See https://github.com/8x8-dxi/ContactNowAPI/blob/master/TOKEN.md for more info
            TOKEN = JSON.parse(body);
            if (!TOKEN.success && !TOKEN.token || TOKEN.error){
                throw new Error(TOKEN);
            }
            // Store token to a local file
            fs.writeFile(__TOKEN_FILE_PATH, body, function (err) {
                if (err){
                    throw new Error("Could not save token data");
                }
                console.info('Token file saved!');
            });
            return callbackFunction(false, TOKEN);
        });
    };
    /**
     * Attempt to get the last stored token and if it does exit we check if
     * it still within the expiration period.
     * @param {Function} callbackFunction
     * @returns {undefined}
     */
    var getToken = function (callbackFunction) {
        if (typeof callbackFunction !== 'function'){
            throw new Error("Please provide a callback function!");
        }
        try{
            var tokenObject = (JSON.parse(fs.readFileSync(__TOKEN_FILE_PATH, "utf8")));
            if (tokenObject.token && tokenObject.expire) {
                // get current time 
                var currentTime = new Date(),
                    expireTime = new Date(tokenObject.expire*1000),
                    // if the current time is > or == to the expired time - offest of 1 minute
                    isExpired = currentTime.getTime() >= (expireTime.getTime() - (1 * 60000));
                    
                console.info('Is the current token expired? ', isExpired);
                // reduce the expire time by one minute               
                if (isExpired){
                    return generateToken(callbackFunction);
                }
                return callbackFunction(false, tokenObject);
            }
            
        } catch(exeption){
            return generateToken(callbackFunction);
        }
    };

    /**
     * 
     * @param {Function} callBackFunction
     * @returns {undefined}
     */
    var fetchCalls = function (callBackFunction) {
        if (typeof callBackFunction !== 'function'){
            throw new Error("Please provide a callback function as parameter");
        }

        var options = {
            method: 'GET',
            url: reportingEndpoint,
            qs: {
                token: '',// Toke will be intitialised in getToken Function
                method: 'calls',
                fields: 'qtable,qtype,qid,qnm,aid,anm,dsid,dsnm,urn,ddi,cli,tid,tnm,has_aid,PT1H,P1D,P1W,P1M,date,day,hour,min_10,dest,dcode,ctype,dtype,cres,is_mob,nc_all,nc_in,nc_out,nc_out_all,nc_sms_out,nc_man,nc_tpt,nc_dtpt,nc_wait,nc_wrap,nc_con,nc_ans,nc_ans_in,nc_ans_man,nc_que,nc_ans_le,nc_ans_gt,nc_que_le,nc_que_gt,sec_dur,sec_talk_all,sec_talk,sec_tpt,sec_call,sec_ans,ocid,ocnm,ocis_cmpl,ocis_cmpli,ocis_sale,ocis_dmc,oc_abdn,oc_cbck,oc_ama,oc_amd,oc_dead,oc_noansw,oc_sale,oc_cmpl,oc_cmpli,oc_ncmpl,oc_dmc,cost_cust,bill_cust,bill_dur',
                range: tstart + ':'+tstop, // Start and stop time in UTC
                groupby: 'qtable,qnm', // Group the data by Campaign table and queue name
                agent: 503314,// Notice I am filtering by agent ID which should return every call handled by this agent only
                format: 'json'
                //apply any other filters
                //campaign:"",
                //queue:"",
               //qtype:"",
               //ctype:"",
               //agent:"",
               //dataset:"",
               //outcome:"",
               //ddi:"",
               //cli:"",
               //urn:"",
            }
        };
        // Get token and then attempt fetching the calls data
        getToken(function(err, tokenData){
            if(err || !tokenData.success || !tokenData.token){
                throw new Error("Unable to retrieve token data");
            }
            options.qs.token = tokenData.token;
            request(options, function (error, response, body) {
              if (error){
                  throw new Error(error);
              }
              // print result to console.
              // print result to console.
              var data = JSON.parse(body);
              return callBackFunction(data);
              
              // Console log
              /*
                  console.info(data);
                    {
                    "success": true,
                            "total": 7,
                            "list": [
                            {
                            "ccid": "315",
                                    "ccnm": "ECONStaff",
                                    "qtable": "APItestcampaign",
                                    "qtype": "outbound",
                                    "qid": "719718",
                                    "qnm": "API-DDI",
                                    "aid": "503314",
                                    "anm": "Christian Davies",
                                    "dsid": "0",
                                    "dsnm": null,
                                    "urn": "0",
                                    "ddi": "01234567890",
                                    "cli": "01234567890",
                                    "tid": "2000059307",
                                    "tnm": "Team Coco",
                                    "has_aid": "1",
                                    "PT1H": "2017-08-21_10-00-00",
                                    "P1D": "2017-08-21",
                                    "P1W": "2017-08-20",
                                    "P1M": "2017-08",
                                    "date": "2017-08-21",
                                    "day": "Monday",
                                    "hour": "10",
                                    "min_10": "30",
                                    "dest": "Landline Standard",
                                    "dcode": "442",
                                    "ctype": "out",
                                    "dtype": "man",
                                    "cres": "TPT",
                                    "is_mob": "0",
                                    "nc_all": 10,
                                    "nc_in": 0,
                                    "nc_out": 0,
                                    "nc_out_all": 0,
                                    "nc_sms_out": 0,
                                    "nc_man": 10,
                                    "nc_tpt": 0,
                                    "nc_dtpt": 0,
                                    "nc_wait": 10,
                                    "nc_wrap": 10,
                                    "nc_con": 8,
                                    "nc_ans": 0,
                                    "nc_ans_in": 0,
                                    "nc_ans_man": 8,
                                    "nc_que": 0,
                                    "nc_ans_le": 0,
                                    "nc_ans_gt": 0,
                                    "nc_que_le": 0,
                                    "nc_que_gt": 0,
                                    "sec_dur": 25.597082138062,
                                    "sec_talk_all": 25.59,
                                    "sec_talk": 0,
                                    "sec_tpt": 25.59,
                                    "sec_call": 28,
                                    "sec_ans": 0,
                                    "ocid": "101",
                                    "ocnm": "Answer Machine (Agent)",
                                    "ocis_cmpl": "0",
                                    "ocis_cmpli": "0",
                                    "ocis_sale": "0",
                                    "ocis_dmc": "0",
                                    "oc_abdn": 0,
                                    "oc_cbck": 0,
                                    "oc_ama": 4,
                                    "oc_amd": 0,
                                    "oc_dead": 0,
                                    "oc_noansw": 2,
                                    "oc_sale": 0,
                                    "oc_cmpl": 0,
                                    "oc_cmpli": 0,
                                    "oc_ncmpl": 10,
                                    "oc_dmc": 0,
                                    "cost_cust": 0.008,
                                    "bill_cust": 0.008,
                                    "bill_dur": 30
                            },
                            ...
                            ]
                    }
                    */
            });
        });
    };

    /**
     *  Pull cdr methods
     * @param {type} callBackFunction
     * @returns {undefined}
     */
    var fetchCDR = function (callBackFunction) {
        if (typeof callBackFunction !== 'function'){
            throw new Error("Please provide a callback function as parameter");
        }
        var options = {
            method: 'GET',
            url: reportingEndpoint,
            qs:{
                token: '',// Toke will be intitialised in getToken Function
                method: 'cdr',
                fields: 'callid,urn,qid,qnm,qtype,qtable,cres,aid,anm,dsid,ocid,ocnm,ddi,cli,flags,carrier,ctag,tag,dest,dcode,ctype,dtype,sms_msg,sec_dur,sec_ring,sec_que,tm_init,tm_answ,tm_disc,oc_sale,oc_cmpl,oc_cmpli,oc_ncmpl,oc_dmc,cost_cust,bill_cust,bill_dur,ivr_key,sec_key,orig_qnm',
                range: tstart + ':'+tstop, // Start and stop time in UTC
                format: 'json',
                agent:503314
                //apply any other filters
                //campaign:"",
                //queue:"",
                //qtype:"",
                //ctype:"",
                //agent:"",
                //dataset:"",
                //outcome:"",
                //ddi:"",
                //cli:"",
                //urn:"",
                //callid:"",
                //sort:"",
                //start:"",
                //limit:"",
            }
        };
        // Get token and then attempt fetching the cdr data
        getToken(function(err, tokenData){
            if(err || !tokenData.success || !tokenData.token){
                throw new Error("Unable to retrieve token data");
            }
            options.qs.token = TOKEN = tokenData.token;
            console.info("Request: ", options);
            request(options, function (error, response, body) {
              if (error){
                  throw new Error(error);
              }
              // print result to console.
              var data = JSON.parse(body);
              return callBackFunction(data);
              
              /*
              // Console log
              console.info(data);
              {
                "success": true,
                "total": 68,
                "list": [
                    {
                        "callid": "707228882",
                        "urn": "2428765",
                        "qid": "504016",
                        "qnm": "Christian Inbound Testing - Do not unassign",
                        "qtype": "inbound",
                        "qtable": "SomeTest",
                        "cres": "Answered",
                        "aid": "503314",
                        "anm": "William Davies",
                        "dsid": "0",
                        "ocid": "5013337",
                        "ocnm": "DNC Complete",
                        "ddi": "01234567890",
                        "cli": "01234567891",
                        "flags": "recorded,processed",
                        "carrier": "bt-ix",
                        "ctag": null,
                        "tag": null,
                        "dest": "44 Landline Standard",
                        "dcode": "44123456",
                        "ctype": "out",
                        "dtype": "out",
                        "sms_msg": null,
                        "sec_dur": "105.026",
                        "sec_ring": "0.000",
                        "sec_que": "80",
                        "tm_init": "1501080575",
                        "tm_answ": "1501080655",
                        "tm_disc": "1501080680",
                        "oc_sale": "1",
                        "oc_cmpl": "0",
                        "oc_cmpli": "1",
                        "oc_ncmpl": "0",
                        "oc_dmc": "1",
                        "cost_cust": "0.045",
                        "bill_cust": "0.0450",
                        "bill_dur": "106.0000",
                        "ivr_key": null,
                        "sec_key": null,
                        "orig_qnm": "William Inbound Testing - Do not unassign"
                    },
                    ...
                    ]
                }
                */
            });
        });
    };
    
    /**
     * This function read customer record from ecnow endpoint. 
     * It takes a CDR data 
     * @param {Object} cdr
     * @returns {undefined}
     */
    var getcustomerRecordByCDR = function(cdr){
        var options = {
            method: 'GET',
            url: ECNOWEndpoint,
            qs: {
                token: TOKEN,
                method: 'ecnow_records',
                format: 'json',
                action: 'read',
                urn: cdr.urn,
                table: cdr.qtable// This is required for targeting the table holding the record
            }
        };
        
        request(options, function (error, response, body) {
              if (error){
                  throw new Error(error);
              }
              // print result to console.
              var customer = JSON.parse(body);
              if (customer && customer.success && customer.total > 0){
                  // Do stuff with the record
              }
              console.info("customer: ", customer);
              /*
              {
                "success": true,
                "total": 1,
                "list": [
                    {
                        "Address1": "121B London Road",
                        "Address2": "",
                        "Address3": "Reading",
                        "Address4": "Berkshire",
                        "Address5": "",
                        "Address6": "",
                        "AgentRef": "503314",
                        "Agent_Specific": "",
                        "appointment": "",
                        "callback": "0000-00-00 00:00:00",
                        "Call_Back_Notes": "",
                        "Call_Back_Sametime": "",
                        "Customer_Email": "",
                        "datasetid": "337",
                        "FirstName": "Eric",
                        "flgid": "",
                        "HomePhone": "",
                        "id": "2428765",
                        "LastName": "Forbes",
                        "loaddate": "2017-06-07",
                        "HomePhone": "01234567890",
                        "MobilePhone": "",
                        "notes": "2017-06-07 15:09:48 agent 503314 set outcome 109\r\n2017-06-07 15:09:49 agent 503314 set outcome 107, call back for 2017-06-07 17:09:00\r\n2017-06-16 10:58:05 agent 503314 set outcome 109\r\n2017-06-16 10:58:06 agent 503314 set outcome 107, call back for 2017-06-16 12:58:00\r\n2017-07-10 13:56:31 agent 503314 set outcome 19, call back for 2017-06-16 12:58:00, 2017-07-10 13:56:31 agent 503314 set wrong number 01184320014, no numbers left\r\n2017-07-17 09:49:49 agent 503314 set outcome 107, call back for 0000-00-00 00:00:00\r\n2017-07-17 10:09:51 agent 503314 set outcome 107, call back for 0000-00-00 00:00:00\r\n",
                        "outcomecode": "107",
                        "Postcode": "RG1 5RG",
                        "ProcessDate": "2017-07-17 10:09:51",
                        "ProcessType": "NEEDSMOREWORK",
                        "sourcefile": "Contact Now Test Data.csv",
                        "Testy": "",
                        "ThisIsATimeField": "",
                        "Title": "Mr",
                        "URN": null,
                        "VENDOR_URN": null,
                        "WorkPhone": ""
                    }
                ]
               */
        });
    };
    
    
    /**
     * Get customer records using data from the CDR log.
     * @returns {undefined}
     */
    var getDialledCustomerRecords = function (){
        fetchCDR(function (cdrResponse) {
            if (!cdrResponse || !cdrResponse.success || !cdrResponse.list){
                throw new Error(cdrResponse);
            }
            // loop through the cdr data whilst requesting each record.
            for (var i = 0, l = cdrResponse.list.length; i < l; ++i) {
                var cdr = cdrResponse.list[i];
                // Notice we are checking the urn value and the table holding the record.
                if (cdr.urn > 0 && cdr.qtable !== ''){
                    getcustomerRecordByCDR(cdr);
                }
            }
        });
    };


// Function executions


//getToken(function (err, token){
//    console.info(err, token);
//})

//generateToken(function (err, token){
//    console.info(err, token);
//});

//fetchCalls(function (calls){
//    console.info(calls);
//});


//getDialledCustomerRecords();
