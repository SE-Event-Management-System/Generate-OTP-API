const axios = require('axios');
const {emailAlertsUrl, emailAlertsTimeout, redisOtpStorageTTL} = require('../../../config/config');
const { setKey } = require('../../../utility/redis.utility');
const { infoLogger, errorLogger } = require('../../../logger/logger');
const errors = require('../../../errors/errors');
const { encrypt } = require('./helperFunctions');

const axiosInstance = axios.create({
    timeout: emailAlertsTimeout,
    headers: {'Content-Type': 'application/json'},
  });

module.exports = async function(otpObject, bodyObject, templateConfiguration){
    try{
        const {EMAIL_SUBJECT, EMAIL_BODY, EXPIRY_TIME_IN_SEC} = templateConfiguration;
        let emailBody = EMAIL_BODY.replace('{TOKEN2}', otpObject.OTP)
                                    .replace('{TOKEN3}', EXPIRY_TIME_IN_SEC);
        delete otpObject.otp;
        const emailSubject = encrypt(EMAIL_SUBJECT);
        emailBody  = encrypt(emailBody);

        if (bodyObject.deliveryFlag == 'E' && bodyObject.serviceType == 'N'){
            const requestBody = {
                requestId: bodyObject.requestId,
                email: bodyObject.email,
                subject: emailSubject,
                body: emailBody
            }
            infoLogger(bodyObject.id, bodyObject.requestId, 'Setting OTP Data');
            await setKey(`${bodyObject.channelId}_${bodyObject.otpRequestId}`, JSON.stringify(otpObject), redisOtpStorageTTL)
            const response = axiosInstance.post(emailAlertsUrl, requestBody)
                                .then(res => {
                                    infoLogger(bodyObject.id, bodyObject.requestId, 'Succesfully sent an email');
                                })
                                .catch(err => {
                                    errorLogger(bodyObject.id, bodyObject.requestId, `Failed to send an email | ${err.message}`, err);
                                });
            return {error: false, message: "Email OTP request initiated"}
        }
    }
    catch(err){
        errorLogger(bodyObject.custom.id, bodyObject.requestId, `Failed to send an email | ${err.message}`, err);
        return {error: true, message: errors['010'].message, code: '010'}
    }
}