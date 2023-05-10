const mongoose = require('mongoose');
var slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

const articleSchema = mongoose.Schema({
    title: { type: String, required: true },
    slug: {type: String, slug: "title", slug_padding_size: 4, unique: true},
    description: { type: String, required: true },
    category: { type: String, required: true },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    imageUrl: { type: String, required: true },
    content: { type: String, required: true },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
    }],
    isDeleted: { type: Boolean, default: false },
    topArticle: { type: Boolean, default: false },
    lang: { type: String, default: 'eng' },
    creationDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('Article', articleSchema);