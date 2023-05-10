var mongoose = require('mongoose');

var slideStatSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    slide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    time: {type: Number},
})

module.exports = mongoose.model('SlideStat', slideStatSchema);	