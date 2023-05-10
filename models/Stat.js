/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @desc [description]
 */

const mongoose = require('mongoose');

const StatSchema = mongoose.Schema({
    reference: {
        type: mongoose.Schema.Types.ObjectId
    },
    type: {
        type: String,
        enum: ['presentation', 'presentation3D', 'template', 'template3D', 'slide'],
        default: 'presentation'
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDuplicated: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    creationDate: {
        type: Date,
        default: Date.now()
    },
    lastSavedTime: {
        type: Date,
        default: Date.now()
    },
});

module.exports = mongoose.model('Stat', StatSchema);