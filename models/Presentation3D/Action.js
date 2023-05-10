var mongoose = require('mongoose');

/**
 * This Model is used in the 3D Presentation called in camera so that we can call
 * the appropriate actions
 */
var actionSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    elements: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    }], // params: usually ids of the elements we will make an action on
    function: {type: String},
    startTime: {type: Number, default: 0},
    lengthTime: {type: Number, default: -1}, // -1 if it doesn't have an end function
    value: {type: String}, // value of whatever param we want to pass. String by default so that we can have the maximum 
    // possibilities and we can later convert it to number if needed 
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Action', actionSchema);