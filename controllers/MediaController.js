const Comment = require('../models/Comment');
const Media = require('../models/Media');
var ObjectId = require('mongodb').ObjectID;

/**
 * For the API calls (may be removed if not needed)
 * @param {*} req 
 * @param {*} res 
 */
exports.createMedia = (req, res) => {
    const media = new Media({
        url: req.body.url,
        backup_url: req.body.url,
        type: req.body.type,
        category: req.body.category,
        name: req.body.name,
    });

    media.save((err, newMedia) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.send(newMedia)
        }
    })
};

exports.fetch3DModels = (req, res) => {
    Media.find({type: 'model3D'}, (err, medias) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(medias)
    }).sort({ category: 'desc' })
};