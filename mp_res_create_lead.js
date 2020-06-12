function createLead(data) {

    //NEW CUSTOMER RECORD
    nlapiLogExecution('DEBUG', 'data', data);
    data = JSON.parse(data);
    var customerRecord = nlapiCreateRecord('lead');

    customerRecord.setFieldValue('companyname', data.businessName);
    customerRecord.setFieldValue('custentity_email_service', data.email);
    customerRecord.setFieldValue('phone', data.phone);
    if (data.leadsource == 'Portal'){
        var quadient = data.businessName.substring(0, 10);
        nlapiLogExecution('DEBUG', 'quadient', quadient);
        if (quadient == 'Quadient -'){
            customerRecord.setFieldValue('leadsource', 246616); //Quadient
        } else {
            customerRecord.setFieldValue('leadsource', 99417); //Inbound - Web
        }
    } else if (data.leadsource == 'Shopify'){
        customerRecord.setFieldValue('leadsource', 246306); //Shopify
    } else if (data.leadsource == 'Airush'){
        customerRecord.setFieldValue('leadsource', 246307); //Airush
    }
    customerRecord.setFieldValue('entitystatus', 57); //Suspect - Hot Lead
    customerRecord.setFieldValue('custentity_hotleads', 'T');
    customerRecord.setFieldValue('partner', 435); //MailPlus Pty Ltd
    customerRecord.setFieldValue('custentity_industry_category', 19); //Other services
    customerRecord.setFieldValue('custentity_date_lead_entered', getDate());
    customerRecord.setFieldValue('custentity_lead_entered_by', 585236); //Portal
    customerRecord.setFieldValue('custentity_frequency', data.frequency);

    //ADDRESS
    customerRecord.selectNewLineItem('addressbook');
    customerRecord.setCurrentLineItemValue('addressbook', 'country', 'AU');
    customerRecord.setCurrentLineItemValue('addressbook', 'addressee', data.businessName);
    customerRecord.setCurrentLineItemValue('addressbook', 'addr1', data.addr1);
    customerRecord.setCurrentLineItemValue('addressbook', 'addr2', data.addr2);
    customerRecord.setCurrentLineItemValue('addressbook', 'city', data.city);
    customerRecord.setCurrentLineItemValue('addressbook', 'state', data.state);
    customerRecord.setCurrentLineItemValue('addressbook', 'zip', data.zip);
    customerRecord.commitLineItem('addressbook');

    var customerRecordId = nlapiSubmitRecord(customerRecord);

    //CONTACT
    var contactRecord = nlapiCreateRecord('contact');
    //contactRecord.setFieldValue('salutation', salutation);
    contactRecord.setFieldValue('firstname', data.firstName);
    contactRecord.setFieldValue('lastname', data.lastName);
    contactRecord.setFieldValue('email', data.email);
    contactRecord.setFieldValue('phone', data.phone);
    //contactRecord.setFieldValue('title', position);
    contactRecord.setFieldValue('company', customerRecordId);
    contactRecord.setFieldValue('entityid', data.firstName + ' ' + data.lastName);
    //contactRecord.setFieldValue('contactrole', role);
    nlapiSubmitRecord(contactRecord);

    //USER NOTE
    if (!isNullorEmpty(data.comments)) {
        var userNoteRecord = nlapiCreateRecord('note');
        userNoteRecord.setFieldValue('title', 'Portal');
        userNoteRecord.setFieldValue('entity', customerRecordId);
        //userNoteRecord.setFieldValue('notetype', $('#notetype option:selected').val());
        userNoteRecord.setFieldValue('note', data.comments);
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
    var cc = ['luke.forbes@mailplus.com.au', 'belinda.urbani@mailplus.com.au', 'ankith.ravindran@mailplus.com.au'];
    var subject = 'Sales HOT Lead - ' + entity_id + ' ' + customer_name + '';
    var cust_id_link = 'https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerRecordId;
    var body = 'New sales record has been created. \n A HOT Lead has been entered into the System. Please respond in an hour. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;

    if (data.state == 'NSW') {
        to = ['niz.ali@mailplus.com.au', 'kerina.helliwell@mailplus.com.au'];
        //to = ['gaelle.greiveldinger@mailplus.com.au'];
        body = 'Dear Kerina & Niz, \n \nA HOT Lead has been entered into the System. Please create a Sales Record to assign it to yourself. \n Customer Name: ' + entity_id + ' ' + customer_name + '\nLink: ' + cust_id_link;
        nlapiSendEmail(from, to, subject, body);
    } else {
        var salesRecord = nlapiCreateRecord('customrecord_sales');
        var salesRep;
        switch (data.state) {
            case 'QLD':
                salesRep = 668711; //Lee Russell
                to = ['lee.russell@mailplus.com.au']
                break;
            case 'VIC':
                salesRep = 78353; //David Towey
                to = ['david.towey@mailplus.com.au']
                break;
            default:
                salesRep = 668712; //Belinda Urbani
                to = ['belinda.urbani@mailplus.com.au'];
                cc = ['luke.forbes@mailplus.com.au', 'ankith.ravindran@mailplus.com.au'];
        }
        salesRecord.setFieldValue('custrecord_sales_customer', customerRecordId);
        salesRecord.setFieldValue('custrecord_sales_campaign', 62);
        salesRecord.setFieldValue('custrecord_sales_assigned', salesRep);
        salesRecord.setFieldValue('custrecord_sales_outcome', 5);
        salesRecord.setFieldValue('custrecord_sales_callbackdate', getDate());
        var date = new Date();
        salesRecord.setFieldValue('custrecord_sales_callbacktime', nlapiDateToString(date, 'timeofday'));
        nlapiSubmitRecord(salesRecord);
    }
    var dataOut = '{ "data": [{"ns_id":"' + customerRecordId +'"}]}';
    return dataOut
}

function getDate() {
    var date = new Date();
    nlapiLogExecution('DEBUG', 'date', date);
    //date = date.tz('Australia/Sydney').format();
    //nlapiLogExecution('DEBUG', 'date', date);
    date = nlapiDateToString(date);
    //nlapiLogExecution('DEBUG', 'date', date);
    return date;
}