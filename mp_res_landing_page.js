/**
 * Module Description
 * 
 * NSVersion    Date                        Author         
 * 1.00         2020-08-21 15:22:54         Ankith
 *
 * Description: Create Leads on NetSuite coming from the Landing Page on Unbounce.       
 * 
 * @Last Modified by:   ankit
 * @Last Modified time: 2020-11-30 10:59:55
 *
 */

function createLead(data) {

    //Display Original Data coming from the form
    nlapiLogExecution('AUDIT', 'data', data);

    //Decode the data to get the proper URL
    var decodedURL = decodeURIComponent(data);

    //Get data.json from the decoded URL
    var jsonData = decodedURL.substring(
        decodedURL.indexOf("data.json=") + 10,
        decodedURL.lastIndexOf("}") + 1
    );

    //Display the json.data part of the URL
    nlapiLogExecution('AUDIT', 'decodedURL', decodedURL)

    var jsonData_temp1 = jsonData.replace(/\[/g, ""); //replace [ with space ""
    var mainData = jsonData_temp1.replace(/]/g, ""); //replace ] with space ""
    mainData = mainData.replace(/\+/g, " "); //replace + with space ""

    //parse the data
    var parsedMainData = JSON.parse(mainData);

    //NEW CUSTOMER RECORD
    var dataOut = '{"dataOut":[';

    //If Post code is empty, do not create a record on NetSuite
    if (isNullorEmpty(parsedMainData['postcode'])) {
        dataOut += '{"ns_id":"ADDRESS ERROR - Empty Post Code"},';
    } else {

        //Create Lead on NetSuite
        var customerRecord = nlapiCreateRecord('lead');
        customerRecord.setFieldValue('companyname', parsedMainData['business_name']);
        customerRecord.setFieldValue('custentity_email_service', parsedMainData['email_address']);
        customerRecord.setFieldValue('phone', parsedMainData['phone_number']);

        var quadient = parsedMainData['business_name'].substring(0, 10);
        nlapiLogExecution('DEBUG', 'business_name', parsedMainData['business_name']);
        if (quadient == 'Quadient -') {
            customerRecord.setFieldValue('leadsource', 246616); //Quadient
        } else {
            nlapiLogExecution('AUDIT', 'Page URL', parsedMainData['page_url'])
            if (parsedMainData['page_url'] == "http://mailplus.com.au/why-mailplus-express/") {
                customerRecord.setFieldValue('leadsource', 249135); //Inbound - Landing Page
            } else if(parsedMainData['page_url'] == "http://mailplus.com.au/shopify/"){
                customerRecord.setFieldValue('leadsource', 250768); //Inbound - Shopify 
            } else if(parsedMainData['page_url'] == "http://mailplus.com.au/mailplus-auspost/"){
                customerRecord.setFieldValue('leadsource', 251702);
            }
        }
        customerRecord.setFieldValue('entitystatus', 57); //Suspect - Hot Lead
        customerRecord.setFieldValue('custentity_hotleads', 'T');
        customerRecord.setFieldValue('partner', 435); //MailPlus Pty Ltd
        customerRecord.setFieldValue('custentity_industry_category', 19); //Other services
        customerRecord.setFieldValue('custentity_date_lead_entered', getDate());
        customerRecord.setFieldValue('custentity_lead_entered_by', 585236); //Portal
        if (parsedMainData['average_weekly_shipments'] == '1-20 per week') {
            customerRecord.setFieldValue('custentity_form_mpex_usage_per_week', 1);
        } else if (parsedMainData['average_weekly_shipments'] == '21-100 per week') {
            customerRecord.setFieldValue('custentity_form_mpex_usage_per_week', 2);
        } else if (parsedMainData['average_weekly_shipments'] == '100  per week') {
            customerRecord.setFieldValue('custentity_form_mpex_usage_per_week', 3);
        }

        if (parsedMainData['how_did_you_hear_about_us'] == 'Social Media (e.g. Facebook)') {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 1);
        } else if (parsedMainData['how_did_you_hear_about_us'] == 'Article') {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 2);
        } else if (parsedMainData['how_did_you_hear_about_us'] == 'Word of Mouth') {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 3);
        } else if (parsedMainData['how_did_you_hear_about_us'] == 'Search Engine (e.g. Google)') {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 4);
        } else if (parsedMainData['how_did_you_hear_about_us'] == 'Online Forum') {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 5);
        } else {
            customerRecord.setFieldValue('custentity_how_did_you_hear_about_us', 6);
        }

        //ADDRESS
        customerRecord.selectNewLineItem('addressbook');
        customerRecord.setCurrentLineItemValue('addressbook', 'country', 'AU');
        customerRecord.setCurrentLineItemValue('addressbook', 'zip', parsedMainData['postcode']);
        customerRecord.commitLineItem('addressbook');

        var customerRecordId = nlapiSubmitRecord(customerRecord);

        //Create CONTACT

        //Split Full name based on Space
        var fullNameSplit = parsedMainData['full_name'].split(' ');

        var contactRecord = nlapiCreateRecord('contact');
        contactRecord.setFieldValue('firstname', fullNameSplit[0]);
        contactRecord.setFieldValue('lastname', fullNameSplit[1]);
        contactRecord.setFieldValue('email', parsedMainData['email_address']);
        contactRecord.setFieldValue('phone', parsedMainData['phone_number']);
        contactRecord.setFieldValue('company', customerRecordId);
        contactRecord.setFieldValue('entityid', parsedMainData['full_name']);
        contactRecord.setFieldValue('contactrole', -10);
        nlapiSubmitRecord(contactRecord);

        //Create SALES REP
        var customer_record = nlapiLoadRecord('customer', customerRecordId);
        var entity_id = customer_record.getFieldValue('entityid');
        var customer_name = customer_record.getFieldValue('companyname');

        var from = 112209; //MailPlus team
        var to;
        var cc = ['luke.forbes@mailplus.com.au', 'belinda.urbani@mailplus.com.au', 'ankith.ravindran@mailplus.com.au'];
        var subject = 'Sales HOT Lead - ' + entity_id + ' ' + customer_name + '';
        var cust_id_link = 'https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerRecordId;
        var body = 'New sales record has been created. \n A HOT Lead has been entered into the System. Please respond in an hour. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;

        var postcode = parseInt(parsedMainData['postcode']);

        //ACT & NSW Postcodes
        if (postcode >= 2000 && postcode <= 2999) {
            var postcode = parseInt(parsedMainData['postcode']);
            //Byron Bay Postcodes
            if (postcode == 2481 || postcode == 2482) {
                to = ['lee.russell@mailplus.com.au'];
                body = 'Hi Lee, \n \nA HOT Lead has been entered into the System.\n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
                nlapiSendEmail(from, to, subject, body, cc);
                var salesRecord = nlapiCreateRecord('customrecord_sales');
                var salesRep = 668711; //Lee Russell

                salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
                salesRecord.setFieldValue('custrecord_sales_campaign', 62); //Field Sales
                salesRecord.setFieldValue('custrecord_sales_assigned', salesRep);
                salesRecord.setFieldValue('custrecord_sales_outcome', 5);
                salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
                var date = new Date();
                salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
                nlapiSubmitRecord(salesRecord);
            } else if ((postcode >= 2600 && postcode <= 2618) || (postcode >= 2900 && postcode <= 2920)) {
                //ACT Post Codes
                var salesRecord = nlapiCreateRecord('customrecord_sales');
                var salesRep = 696160; //Kerina Helliwell
                to = ['kerina.helliwell@mailplus.com.au'];
                nlapiSendEmail(from, to, subject, body, cc);

                salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
                salesRecord.setFieldValue('custrecord_sales_campaign', 62); //Field Sales
                salesRecord.setFieldValue('custrecord_sales_assigned', salesRep);
                salesRecord.setFieldValue('custrecord_sales_outcome', 5);
                salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
                var date = new Date();
                salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
                nlapiSubmitRecord(salesRecord);

            } else {
                //NSW Postcodes
                to = ['niz.ali@mailplus.com.au', 'kerina.helliwell@mailplus.com.au'];
                body = 'Dear Kerina & Niz, \n \nA HOT Lead has been entered into the System. Please create a Sales Record to assign it to yourself. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
                nlapiSendEmail(from, to, subject, body, cc);
            }

        } else { //Everything else

            //Create Sales Record
            var salesRecord = nlapiCreateRecord('customrecord_sales');
            if (postcode >= 3000 && postcode <= 3999) { //VIC Postcodes
                var salesRep = 690145; //David Gdanski
                to = ['david.gdanski@mailplus.com.au']
            } else if ((postcode >= 4000 && postcode <= 4999) || (postcode >= 800 && postcode <= 999) || (postcode >= 6000 && postcode <= 6999)) { //QLD & NT Postcodes
                var salesRep = 668711; //Lee Russell
                to = ['lee.russell@mailplus.com.au']
            } else if (postcode >= 7000 && postcode <= 7999) { //TAS Postcodes
                var salesRep = 765724; //Niz Ali
                to = ['niz.ali@mailplus.com.au']
            } else if (postcode >= 6000 && postcode <= 6999) {
                to = ['lee.russell@mailplus.com.au', 'kerina.helliwell@mailplus.com.au'];
                body = 'Dear Kerina & Lee, \n \nA HOT Lead has been entered into the System. Please create a Sales Record to assign it to yourself. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
                nlapiSendEmail(from, to, subject, body, cc);
            } else { //Everything else
                var salesRep = 668712; //Belinda Urbani
                to = ['belinda.urbani@mailplus.com.au'];
            }

            nlapiSendEmail(from, to, subject, body, cc);

            salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
            salesRecord.setFieldValue('custrecord_sales_campaign', 62); //Field Sales
            salesRecord.setFieldValue('custrecord_sales_assigned', salesRep);
            salesRecord.setFieldValue('custrecord_sales_outcome', 5);
            salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
            var date = new Date();
            salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
            nlapiSubmitRecord(salesRecord);
        }

        //Send Email to Customer who filled out the Landing Page Form
        var url = 'https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=395&deploy=1&compid=1048144&h=6d4293eecb3cb3f4353e&rectype=customer&template=';
        var template_id = 94;
        var newLeadEmailTemplateRecord = nlapiLoadRecord('customrecord_camp_comm_template', template_id);
        var templateSubject = newLeadEmailTemplateRecord.getFieldValue('custrecord_camp_comm_subject');
        var emailAttach = new Object();
        emailAttach['entity'] = customerRecordId;

        url += template_id + '&recid=' + customerRecordId + '&salesrep=' + salesRep + '&dear=' + parsedMainData['full_name'] + '&contactid=' + null + '&userid=' + encodeURIComponent(nlapiGetContext().getUser());;
        urlCall = nlapiRequestURL(url);
        var emailHtml = urlCall.getBody();

        nlapiSendEmail(112209, parsedMainData['email_address'], templateSubject, emailHtml, null, null, emailAttach)
    }



    dataOut += '{"ns_id":"' + customerRecordId + '"},';

    dataOut = dataOut.substring(0, dataOut.length - 1);
    dataOut += ']}';
    nlapiLogExecution('DEBUG', 'dataOut', dataOut);
    // dataOut = JSON.parse(dataOut);
    return dataOut;

}

function formatStateName(stateName) {
    stateName = stateName.toLowerCase();
    nlapiLogExecution('DEBUG', 'stateName', stateName);
    switch (stateName) {
        case 'new south wales':
            stateName = 'nsw';
            break;
        case 'victoria':
            stateName = 'vic';
            break;
        case 'queensland':
            stateName = 'qld';
            break;
        case 'northern territory':
            stateName = 'nt';
            break;
        case 'south australia':
            stateName = 'sa';
            break;
        case 'western australia':
            stateName = 'wa';
            break;
        case 'australian capital territory':
            stateName = 'act';
            break;
        case 'tasmania':
            stateName = 'tas';
            break;
    }
    return stateName.toUpperCase();
}

function geocodeAddress(address) {
    var position;
    var geocode = new google.maps.Geocoder();
    geocoder.geocode({
        'address': address
    }, function(results, status) {
        if (status === 'OK') {
            position = results[0].geometry.location;
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
    return position
}

function getTerritory(lat, lng) {
    var territory = [];
    var file = nlapiLoadFile(3772482);
    var data = file.getValue();
    //nlapiLogExecution('DEBUG', 'data', data);
    data = JSON.parse(data);
    var territories = data.features;
    for (k = 0; k < territories.length; k++) {
        var polygon_array = territories[k].geometry.coordinates;
        var polygon = [];
        if (polygon_array.length > 1) {
            for (i = 0; i < polygon_array.length; i++) {
                polygon = polygon.concat(polygon_array[i][0]);
            }
        } else {
            polygon = polygon_array[0];
        }
        var isInTerritory = inside([lng, lat], polygon);
        if (isInTerritory == true) {
            territory[territory.length] = territories[k].properties.name;
        }
    }
    return territory;
}

function inside(point, polygon) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0],
        y = point[1];
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i][0],
            yi = polygon[i][1];
        var xj = polygon[j][0],
            yj = polygon[j][1];

        var intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

function getDate() {
    var date = new Date();
    if (date.getHours() > 6) {
        date = nlapiAddDays(date, 1);
    }
    date = nlapiDateToString(date);
    return date;
}