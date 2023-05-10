var mongoose = require('mongoose');

/**
 * Plays the role of both a chat message between assistant/user and a presentation live comment/message
 */
var MessageSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    type: {type: String, default: 'assistant'},
    value: {type: String},
    intent: {type: String}, // the intent classification value/tag from the assistant
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isUserSender: {type: Boolean}, // only needed for assistant discussions, to differeneciate between the speakers
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    }, // only needed for live presentations comments
    actionCalled: {type: String} //is not always used
})

module.exports = mongoose.model('Message', MessageSchema);