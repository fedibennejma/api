/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-03 11:55:32
 * @modify date 2021-02-03 11:55:34
 * @desc [description]
 */

const mongoose = require('mongoose');

const tagSchema = mongoose.Schema({
  tagName: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  creationDate: { type: Date, default: Date.now() },
  articles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  }],
});

module.exports = mongoose.model('Tag', tagSchema);