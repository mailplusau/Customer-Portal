function createLead(data) {

    //NEW CUSTOMER RECORD
    var dataOut = '{"dataOut":[';

    for (var fieldname in data) {
        if (data.hasOwnProperty(fieldname)) {
            nlapiLogExecution('DEBUG', 'fieldname', fieldname);
            nlapiLogExecution('DEBUG', 'data[fieldname].length', data[fieldname].length);
            for (var x = 0; x < data[fieldname].length; x++) {
                nlapiLogExecution('DEBUG', 'data[fieldname][x][businessName]', data[fieldname][x]['businessName']);
                var customerRecord = nlapiCreateRecord('lead');

                customerRecord.setFieldValue('companyname', data[fieldname][x]['businessName']);
                customerRecord.setFieldValue('custentity_email_service', data[fieldname][x]['email']);
                customerRecord.setFieldValue('phone', data[fieldname][x]['phone']);
                if (data[fieldname][x]['leadsource'] == 'Portal') {
                    var quadient = data[fieldname][x]['businessName'].substring(0, 10);
                    nlapiLogExecution('DEBUG', 'quadient', quadient);
                    if (quadient == 'Quadient -') {
                        customerRecord.setFieldValue('leadsource', 246616); //Quadient
                    } else {
                        customerRecord.setFieldValue('leadsource', 99417); //Inbound - Web
                    }
                } else if (data[fieldname][x]['leadsource'] == 'Shopify') {
                    customerRecord.setFieldValue('leadsource', 246306); //Shopify
                } else if (data[fieldname][x]['leadsource'] == 'Airush') {
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
                customerRecord.setCurrentLineItemValue('addressbook', 'addr1', data[fieldname][x]['addr1']);
                customerRecord.setCurrentLineItemValue('addressbook', 'addr2', data[fieldname][x]['addr2']);
                customerRecord.setCurrentLineItemValue('addressbook', 'city', data[fieldname][x]['city']);
                customerRecord.setCurrentLineItemValue('addressbook', 'state', data[fieldname][x]['state']);
                customerRecord.setCurrentLineItemValue('addressbook', 'zip', data[fieldname][x]['zip']);
                customerRecord.commitLineItem('addressbook');

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
                if (!isNullorEmpty(data[fieldname][x]['comments'])) {
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
                var cc = ['luke.forbes@mailplus.com.au', 'belinda.urbani@mailplus.com.au', 'ankith.ravindran@mailplus.com.au', 'gaelle.greiveldinger@mailplus.com.au'];
                var subject = 'Sales HOT Lead - ' + entity_id + ' ' + customer_name + '';
                var cust_id_link = 'https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerRecordId;
                var body = 'New sales record has been created. \n A HOT Lead has been entered into the System. Please respond in an hour. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;

                if (data[fieldname][x]['state'] == 'NSW') {
                    to = ['niz.ali@mailplus.com.au', 'kerina.helliwell@mailplus.com.au'];
                    //to = ['gaelle.greiveldinger@mailplus.com.au'];
                    body = 'Dear Kerina & Niz, \n \nA HOT Lead has been entered into the System. Please create a Sales Record to assign it to yourself. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
                    nlapiSendEmail(from, to, subject, body, cc);
                } else {
                    var salesRecord = nlapiCreateRecord('customrecord_sales');
                    var salesRep;
                    switch (data[fieldname][x]['state']) {
                        case 'QLD':
                            salesRep = 668711; //Lee Russell
                            to = ['lee.russell@mailplus.com.au']
                            break;
                        case 'VIC':
                            salesRep = 78353; //David Gdanski
                            to = ['david.gdanski@mailplus.com.au']
                            break;
                        default:
                            salesRep = 668712; //Belinda Urbani
                            to = ['belinda.urbani@mailplus.com.au'];
                            cc = ['luke.forbes@mailplus.com.au', 'ankith.ravindran@mailplus.com.au', 'gaelle.greiveldinger@mailplus.com.au'];
                    }
                    nlapiSendEmail(from, to, subject, body, cc);
                    salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
                    salesRecord.setFieldValue('custrecord_sales_campaign', 62);
                    salesRecord.setFieldValue('custrecord_sales_assigned', salesRep);
                    salesRecord.setFieldValue('custrecord_sales_outcome', 5);
                    salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
                    var date = new Date();
                    salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
                    nlapiSubmitRecord(salesRecord);
                }
                dataOut += '{"ns_id":"' + customerRecordId + '"},';

                /*                for (var insidefieldname in data[fieldname][x]) {
                                    nlapiLogExecution('DEBUG', 'insidefieldname', insidefieldname); //KEY
                                    nlapiLogExecution('DEBUG', 'data[fieldname][x][insidefieldname]', data[fieldname][x][insidefieldname]) //VALUE
                                }*/
            }

        }
    }
    dataOut = dataOut.substring(0, dataOut.length - 1);
    dataOut += ']}';
    dataOut = JSON.parse(dataOut);
    return dataOut
}

function getDate() {
    var date = new Date();
    if (date.getHours() > 6) {
        date = nlapiAddDays(date, 1);
    }
    date = nlapiDateToString(date);
    return date;
}