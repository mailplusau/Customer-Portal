function createLead(data) {

    //NEW CUSTOMER RECORD
    var dataOut = '{"dataOut":[';

    for (var fieldname in data) {
        if (data.hasOwnProperty(fieldname)) {
            for (var x = 0; x < data[fieldname].length; x++) {
                nlapiLogExecution('DEBUG', 'data[fieldname][x][businessName]', data[fieldname][x]['businessName']);
                nlapiLogExecution('DEBUG', 'data[fieldname][x][city]', data[fieldname][x]['city']);
                nlapiLogExecution('DEBUG', 'data[fieldname][x][state]', data[fieldname][x]['state']);
                nlapiLogExecution('DEBUG', 'data[fieldname][x][zip]', data[fieldname][x]['zip']);
                nlapiLogExecution('DEBUG', 'data[fieldname][x][addr1]', data[fieldname][x]['addr1']);
                nlapiLogExecution('DEBUG', 'data[fieldname][x][addr2]', data[fieldname][x]['addr2']);
                if (isNullorEmpty(data[fieldname][x]['city']) || isNullorEmpty(data[fieldname][x]['state']) || isNullorEmpty(data[fieldname][x]['zip']) || data[fieldname][x]['city'] == "n/a" || data[fieldname][x]['state'] == "n/a" || data[fieldname][x]['zip'] == "n/a") {
                    dataOut += '{"ns_id":"ADDRESS ERROR - Empty city, state and/or zip. The lead was not created."},';
                } else { //lead only created if the address is correct
                    var customerRecord = nlapiCreateRecord('lead');
                    customerRecord.setFieldValue('companyname', data[fieldname][x]['businessName']);
                    customerRecord.setFieldValue('custentity_email_service', data[fieldname][x]['email']);
                    customerRecord.setFieldValue('phone', data[fieldname][x]['phone']);
                    if (data[fieldname][x]['leadsource'].toLowerCase() == 'portal') {
                        var quadient = data[fieldname][x]['businessName'].substring(0, 10);
                        nlapiLogExecution('DEBUG', 'quadient', quadient);
                        if (quadient == 'Quadient -') {
                            customerRecord.setFieldValue('leadsource', 246616); //Quadient
                        } else {
                            customerRecord.setFieldValue('leadsource', 99417); //Inbound - Web
                        }
                    } else if (data[fieldname][x]['leadsource'].toLowerCase() == 'shopify') {
                        customerRecord.setFieldValue('leadsource', 246306); //Shopify
                    } else if (data[fieldname][x]['leadsource'].toLowerCase() == 'airush') {
                        customerRecord.setFieldValue('leadsource', 246307); //Airush
                    }
                    customerRecord.setFieldValue('entitystatus', 57); //Suspect - Hot Lead
                    customerRecord.setFieldValue('custentity_hotleads', 'T');
                    customerRecord.setFieldValue('partner', 435); //MailPlus Pty Ltd
                    customerRecord.setFieldValue('custentity_industry_category', 19); //Other services
                    customerRecord.setFieldValue('custentity_date_lead_entered', getDate());
                    customerRecord.setFieldValue('custentity_lead_entered_by', 585236); //Portal
                    customerRecord.setFieldValue('custentity_frequency', data[fieldname][x]['frequency']);

                    //ADDRESS
                    customerRecord.selectNewLineItem('addressbook');
                    customerRecord.setCurrentLineItemValue('addressbook', 'country', 'AU');
                    customerRecord.setCurrentLineItemValue('addressbook', 'addressee', data[fieldname][x]['businessName']);
                    customerRecord.setCurrentLineItemValue('addressbook', 'addr2', data[fieldname][x]['addr1']); //reversed because comes the other way from the portal
                    if (data[fieldname][x]['addr2'] != "n/a" && data[fieldname][x]['addr2'] != "N/A") {
                        customerRecord.setCurrentLineItemValue('addressbook', 'addr1', data[fieldname][x]['addr2']);
                    }
                    customerRecord.setCurrentLineItemValue('addressbook', 'city', data[fieldname][x]['city']);
                    customerRecord.setCurrentLineItemValue('addressbook', 'state', formatStateName(data[fieldname][x]['state']));
                    customerRecord.setCurrentLineItemValue('addressbook', 'zip', data[fieldname][x]['zip']);

                    var fullAddress = '' + data[fieldname][x]['addr1'] + ',' + data[fieldname][x]['city'] + ',' + formatStateName(data[fieldname][x]['state']) + '';
                    nlapiLogExecution('DEBUG', 'fullAddress', fullAddress);

                    var result = nlapiRequestURL('https://maps.googleapis.com/maps/api/geocode/json?address=' + fullAddress + '&key=AIzaSyA92XGDo8rx11izPYT7z2L-YPMMJ6Ih1s0&libraries=places');

                    var resultJSON = JSON.parse(result.getBody());

                    var subrecord = customerRecord.editCurrentLineItemSubrecord('addressbook', 'addressbookaddress');

                    var lat = resultJSON.results[0].geometry.location.lat;
                    var lng = resultJSON.results[0].geometry.location.lng;
                    //var lat = data[fieldname][x]['lat'];
                    //var lng = data[fieldname][x]['lng'];
                    nlapiLogExecution('DEBUG', 'lat', lat);
                    nlapiLogExecution('DEBUG', 'lng', lng);
                    //subrecord.setFieldValue('custrecord_address_lat', lat);
                    //subrecord.setFieldValue('custrecord_address_lon', lng);
                    customerRecord.setCurrentLineItemValue('addressbook', 'custrecord_address_lat', lat);
                    customerRecord.setCurrentLineItemValue('addressbook', 'custrecord_address_lon', lng);
                    //subrecord.commit();
                    customerRecord.commitLineItem('addressbook');

                    var territory = getTerritory(lat, lng);
                    nlapiLogExecution('DEBUG', 'territory', territory);
                    nlapiLogExecution('DEBUG', 'territory.length', territory.length);
                    if (territory.length == 1) {
                        var searched_zee = nlapiLoadSearch('partner', 'customsearch_job_inv_process_zee');
                        var newFilters = new Array();
                        newFilters[newFilters.length] = new nlobjSearchFilter('entityid', null, 'is', territory[0]);
                        searched_zee.addFilters(newFilters);
                        var zeeResults = searched_zee.runSearch();
                        var zeeResult = zeeResults.getResults(0, 1);
                        nlapiLogExecution('DEBUG', 'zeeResult.length', zeeResult.length);
                        if (zeeResult.length != 0) {
                            var zee_id = zeeResult[0].getValue('internalid');
                            nlapiLogExecution('DEBUG', 'zee_id', zee_id);
                            customerRecord.setFieldValue('partner', zee_id);
                        }
                    }
                    var customerRecordId = nlapiSubmitRecord(customerRecord);

                    //CONTACT
                    var contactRecord = nlapiCreateRecord('contact');
                    //contactRecord.setFieldValue('salutation', salutation);
                    contactRecord.setFieldValue('firstname', data[fieldname][x]['firstName']);
                    contactRecord.setFieldValue('lastname', data[fieldname][x]['lastName']);
                    contactRecord.setFieldValue('email', data[fieldname][x]['email']);
                    contactRecord.setFieldValue('phone', data[fieldname][x]['phone']);
                    //contactRecord.setFieldValue('title', position);
                    contactRecord.setFieldValue('company', customerRecordId);
                    contactRecord.setFieldValue('entityid', data[fieldname][x]['firstName'] + ' ' + data[fieldname][x]['lastName']);
                    //contactRecord.setFieldValue('contactrole', role);
                    nlapiSubmitRecord(contactRecord);

                    //USER NOTE
                    if (!isNullorEmpty(data[fieldname][x]['comments']) || data[fieldname][x]['comments'] != 'N/A') {
                        var userNoteRecord = nlapiCreateRecord('note');
                        userNoteRecord.setFieldValue('title', 'Portal');
                        userNoteRecord.setFieldValue('entity', customerRecordId);
                        //userNoteRecord.setFieldValue('notetype', $('#notetype option:selected').val());
                        userNoteRecord.setFieldValue('note', data[fieldname][x]['comments']);
                        userNoteRecord.setFieldValue('author', nlapiGetUser());
                        userNoteRecord.setFieldValue('notedate', getDate());
                        nlapiSubmitRecord(userNoteRecord);
                    }

                    //SALES REP
                    var customer_record = nlapiLoadRecord('customer', customerRecordId);
                    var entity_id = customer_record.getFieldValue('entityid');
                    var customer_name = customer_record.getFieldValue('companyname');

                    var from = 112209; //MailPlus team
                    var to;
                    var cc = ['luke.forbes@mailplus.com.au', 'belinda.urbani@mailplus.com.au'];
                    var subject = 'Sales HOT Lead - ' + entity_id + ' ' + customer_name + '';
                    var cust_id_link = 'https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerRecordId;
                    var body = 'New sales record has been created. \n A HOT Lead has been entered into the System. Please respond in an hour. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;

                    if (formatStateName(data[fieldname][x]['state']) == 'NSW') {
                        if (data[fieldname][x]['zip'] == "2481" || data[fieldname][x]['zip'] == "2482") {
                            var salesRecord = nlapiCreateRecord('customrecord_sales');
                            var salesRep;
                            salesRep = 668711; //Lee Russell
                            to = ['lee.russell@mailplus.com.au'];
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
                            to = ['kerina.helliwell@mailplus.com.au'];
                            //to = ['gaelle.greiveldinger@mailplus.com.au'];
                            body = 'Dear Kerina, \n \nA HOT Lead has been entered into the System. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
                            nlapiSendEmail(from, to, subject, body, cc);

                            salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
                            salesRecord.setFieldValue('custrecord_sales_campaign', 62); //Field Sales
                            salesRecord.setFieldValue('custrecord_sales_assigned', 696160);
                            salesRecord.setFieldValue('custrecord_sales_outcome', 5);
                            salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
                            var date = new Date();
                            salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
                            nlapiSubmitRecord(salesRecord);
                        }


                    } else {
                        var salesRecord = nlapiCreateRecord('customrecord_sales');
                        var salesRep;
                        switch (formatStateName(data[fieldname][x]['state'])) {
                            case 'QLD':
                                salesRep = 668711; //Lee Russell
                                to = ['lee.russell@mailplus.com.au']
                                break;
                            case 'VIC':
                                salesRep = 690145; //David Gdanski
                                to = ['david.gdanski@mailplus.com.au']
                                break;
                            case 'TAS':
                                salesRep = 765724; //Niz Ali
                                to = ['niz.ali@mailplus.com.au']
                                break;
                            case 'WA':
                                salesRep = 668711; //Lee Russell
                                to = ['lee.russell@mailplus.com.au', 'kerina.helliwell@mailplus.com.au']
                                break;
                            default:
                                salesRep = 668712; //Belinda Urbani
                                to = ['belinda.urbani@mailplus.com.au'];
                                cc = ['luke.forbes@mailplus.com.au'];
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
                    dataOut += '{"ns_id":"' + customerRecordId + '"},';

                    //Send Email to Customer who filled out the Sign Up Form
                    var url = 'https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=395&deploy=1&compid=1048144&h=6d4293eecb3cb3f4353e&rectype=customer&template=';
                    var template_id = 94;
                    var newLeadEmailTemplateRecord = nlapiLoadRecord('customrecord_camp_comm_template', template_id);
                    var templateSubject = newLeadEmailTemplateRecord.getFieldValue('custrecord_camp_comm_subject');
                    var emailAttach = new Object();
                    emailAttach['entity'] = customerRecordId;

                    url += template_id + '&recid=' + customerRecordId + '&salesrep=' + salesRep + '&dear=' + data[fieldname][x]['firstName'] + '&contactid=' + null + '&userid=' + encodeURIComponent(nlapiGetContext().getUser());;
                    urlCall = nlapiRequestURL(url);
                    var emailHtml = urlCall.getBody();

                    nlapiSendEmail(112209, data[fieldname][x]['email'], templateSubject, emailHtml, null, null, emailAttach)
                }

            }

        }
    }
    dataOut = dataOut.substring(0, dataOut.length - 1);
    dataOut += ']}';
    nlapiLogExecution('DEBUG', 'dataOut', dataOut);
    dataOut = JSON.parse(dataOut);
    return dataOut
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