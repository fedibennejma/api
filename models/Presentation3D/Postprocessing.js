var mongoose = require('mongoose');

/**
 * This Model is used in the 3D Presentation called in scene so that it applies the right postprocessing data
 */
var postprocessingSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    scene: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene'
    }], // just a ref to the parent
    name: {type: String},
    value: {type: String},
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Action', postprocessingSchema);