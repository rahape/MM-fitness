const nodemailer = require('nodemailer');

module.exports = {
    sendMail
}

function sendMail(user, env, messageType) {

    // Setup
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: false,
        port: 25,
        auth: {
            user: 'mmfitness.noreply@gmail.com',
            pass: env.adminEmailPass
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Sender and receiver
    let HelperOptions = {
        from: '"MM Fitness" <MMFitness.NoReply@gmail.com>',
        to: user.username
    };
    
    // Check which type of e-mail to send
    if(messageType === "welcome"){
        HelperOptions.subject = "Velkommen til MM-Fitness";
        HelperOptions.text = 'Velkommen ' + user.firstName + ' ' + user.lastName +  '!\n\nDu er nu medlem af MM-Fitness applikationen. \n \nVenlig hilsen, \nAdministratoren';
    } else {
        HelperOptions.subject = "Tak for denne gang"
        HelperOptions.text = "Du er ikke længere medlem af MM-fitness applikationen. \n\nHeld og lykke fremover, \nAdministratoren"
    }
    
    // Send the mail
    transporter.sendMail(HelperOptions, (error, info) => {
        if(error) {
            console.log(error);
        };
    });
};