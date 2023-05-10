var mongoose = require('mongoose');

var PaymentSchema = new mongoose.Schema
({
    amount: {type: Number},
    token: {type: String},
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    transaction_id: {type: String},
    buyer_id: {type: String},
})

module.exports = mongoose.model('Payment', PaymentSchema);	