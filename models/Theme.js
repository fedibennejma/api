var mongoose = require('mongoose');

var ThemeSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    svg: {type: String, default:''},
    name: {type: String}, // exp: Marina, Tropic etc...
    layout: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Layout'
    }],
    isDeleted: {type: Boolean, default: false},
    // a little similar to a mixture between slides and elements. Each layoutScheme represents a slide
    /*layout: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'layout'
    }],*/
})

module.exports = mongoose.model('Theme', ThemeSchema);