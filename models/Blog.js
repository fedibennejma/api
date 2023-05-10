const mongoose = require('mongoose');

const blogSchema = mongoose.Schema({
    name: { type: String, required: true },
    slug: {type: String, slug: "name", slug_padding_size: 4, unique: true},
    description: { type: String, required: true },
    articles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }],
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now() },
    lang: { type: String, default: 'eng' },
});

module.exports = mongoose.model('Blog', blogSchema);