var mongoose = require('mongoose');

/**
 * TODO
 * We leave it like this for now, but it needs to be changed to liveEvent model, and each user invitation put into invitationSchema.
 * The main data (svg, scheduled time etc ) should be in the liveEventSchema, and the user invitation just containing userId and maybe other things
 * like accepted/declined etc 
 */
var invitationSchema = new mongoose.Schema
({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    description: {type: String},
    thumbnail: {type: String, default: ''}, // svg (by default the first slide svg of the presentation) but can also be a selected image
    isPrivate: {type: Boolean, default: true},
    creationDate: {type: Date, default: Date.now()},
    timeSchedule: {type: Date},
    isDeleted: {type: Boolean, default: false},
    userPermissions: {type: String, enum: ['read', 'edit', 'copy'], default: 'read'},
})

module.exports = mongoose.model('Invitation', invitationSchema);	