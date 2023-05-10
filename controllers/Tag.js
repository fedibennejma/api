/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-03 11:54:25
 * @modify date 2021-02-03 11:56:12
 * @desc [description]
 */
const Tag = require('../models/Tag');

exports.createTag = (req, res, next) => {
    const tag = new Tag({
        tagName: req.body.tagName
    });
    tag.save((err, tag) => {
        if (err)
            res.status(500).send(err)
        res.send(tag)
    })
};

exports.getAllTag = (req, res, next) => {
    Tag.find({ isDeleted: false }, (err, tags) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(tags)
    })
};