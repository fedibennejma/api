const Contact = require('../models/Contact');
const MailController = require('./MailController');

exports.createContact = (req, res, next) => {
    const contact = new Contact({
        userName: req.body.userName,
        phone: req.body.phone,
        email: req.body.email,
        title: req.body.title,
        subject: req.body.subject,
        content: req.body.content,
        theme: req.body.theme,
        company: req.body.company,
        type: req.body.type,
        bug_url: req.body.bug_url,
        date_url: req.body.date_url,
    });
    contact.save((err, contact) => {
        if (err) {
            res.status(500).send(err)
        } else {
            MailController.sendMailContact(contact, res);
            res.send('mail sent')
        }
    })
};