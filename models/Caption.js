var mongoose = require('mongoose');

var ElementSchema = new mongoose.Schema
({
    type: {type: String, default: 'caption'},
    value: {type: String},
    start: { // manages the starting time of the element
        startTime:{type: Number, default: 0},
        duration: {type: Number, default: 0},
        endTime: {type: Number, default: 0}
    },
    slide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    slideId: {type: String} // only used in the frontend for comparison between active slide and caption slide
})

module.exports = mongoose.model('Caption', ElementSchema);	