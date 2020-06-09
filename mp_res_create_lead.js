function createLead(data) {
    nlapiLogExecution('DEBUG', 'in the script');
    //NEW CUSTOMER RECORD
    nlapiLogExecution('DEBUG', 'data', data);
    data = JSON.parse(data);
    nlapiLogExecution('DEBUG', 'data.businessName', data.businessName);
    nlapiLogExecution('DEBUG', 'data.email', data.email);
    nlapiLogExecution('DEBUG', 'data.phone', data.phone);
    var customerRecord = nlapiCreateRecord('lead');

    customerRecord.setFieldValue('companyname', data.businessName);
    customerRecord.setFieldValue('custentity_email_service', data.email);
    customerRecord.setFieldValue('phone', data.phone);
    customerRecord.setFieldValue('leadsource', 99417); //Inbound - Web
    customerRecord.setFieldValue('status', 57); //Suspect - Hot Lead
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
    /*var zeeRecord = nlapiLoadRecord('partner', )
    var salesRecord = nlapiCreateRecord('customrecord_sales');*/



    return customerRecordId
}

function getDate() {
    var date = new Date();
    date = nlapiDateToString(date);
    return date;
}