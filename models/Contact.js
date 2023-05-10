var mongoose = require('mongoose');

var ContactSchema = new mongoose.Schema
({
    userName: { type: String},
    phone: { type: String},
    email: { type: String},
    title: { type: String},
    subject: { type: String},
    content: { type: String},
    theme: { type: String},
    company: { type: String},
    type: { type: String},
    bug_url: { type: String},
    date_url: { type: Date},
    creationDate: {type: Date, default: Date.now()},
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Contact', ContactSchema);	