var ObjectId = require('mongodb').ObjectID;
var User = require('../models/User');
const Message = require('../models/Message');

let addMessage = (userId, isUserSender, value, intent, action) => {
    if (intent !== undefined && intent !== null && intent.intent !== undefined && intent.intent !== null)
        intent = intent.intent.name

    var message = new Message({
        value: value,
        intent: intent,
        user: userId,
        isUserSender: isUserSender,
        action: action
    })

    message.save(function (err) {
        if (err)
            return false
        else
            return true
    })
}

/**
 * Searches if an intent has already been asked from a user in the last {time} seconds
 * @param {int} userId 
 * @param {string} intent: the intent we search for in the last messages
 * @param {Date} time: time in minutes we search from (last 30 minutes, last 1h etc)
 */
let checkIntentAsked = (userId, intent, time) => {
    let dateNow = new Date(Date.now())
    if (time !== undefined)
        dateNow.setMinutes( dateNow.getMinutes() - time) // new dateTime (time)minutes ago

    return Message.find({ user: userId, type: "assistant", intent: intent, creationDate: {$gt: dateNow} })
}

/**
 * Gets the last message sent by the assistant (used in the repeatAction)
 * @param {*} userId
 */
let getLastAssistantMesage = (userId) => {
    return Message.findOne({ user: userId, type: "assistant"}).sort({ _id: -1 })
}

/**
 * Gets all the messages
 */
let getAllMessages = (req, res) => {
    Message.find({}, function (err, messages) {
        console.log(messages.length)
        res.send(messages)
    })
}

module.exports = {
    addMessage: addMessage,
    checkIntentAsked: checkIntentAsked,
    getLastAssistantMesage: getLastAssistantMesage,
    getAllMessages: getAllMessages
}