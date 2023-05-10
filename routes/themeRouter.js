var express = require('express');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();
const Theme = require('../models/Theme');
const Layout = require('../models/Layout');
const Element = require('../models/Element');
var mongoose = require('mongoose');

/**
 * /theme
 * Adds a theme
 */
router.post('/', function (req, res) {
    let theme = new Theme({
        name: req.body.name,
    })
    theme.save(function (err, theme) {
        if (err)
            res.status(500).send(err)
        res.send(theme)
    })
});

/**
 * /theme/themeId
 * Gets a theme
 */
router.get('/:id', function (req, res) {
    Theme.findOne({ _id: req.params.id }, function (err, theme) {
        if (err)
            res.status(500).send(err)
        res.send(theme)
    }).populate('layout')
});

/**
 * /theme
 * Gets all the themes
 */
router.get('/', function (req, res) {
    Theme.find({ isDeleted: false }, function (err, themes) {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(themes)
    }).populate({
        path: 'layout',
        populate: [
            {
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false }
            },
            {
                path: 'title',
                model: 'Element'
            },
            {
                path: 'subtitle',
                model: 'Element'
            },
            {
                path: 'content',
                model: 'Element'
            }
        ]
    })
});

/**
 * /theme/:themeId/layout
 * Adds a layout to a theme
 */
router.post('/:id/layout', function (req, res) {
    var layout = new Layout({
        name: req.body.name,
        theme: ObjectId(req.params.id)
    });

    layout.save(function (err, layout) {
        if (err)
            res.status(500).send(err)

        Theme.findById(ObjectId(req.params.id), (err, theme) => {
            if (err)
                res.status(500).send(err)
            theme.layout.push(layout);
            theme.save();
            res.send(theme);
        });
    });
});

/**
 * /theme/layout/:idLayout/elements
 * Adds elements to a layout
 */
router.post('/layout/:id/elements', function (req, res) {
    var elements = req.body;

    Element.bulkWrite(
        elements.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id || mongoose.Types.ObjectId() },
                    update: { $set: element },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
        ))).then(result => {
            // to do check if upserted is undefined on first creation, it seems that it only adds the element to the layout once we already added the element before
            Layout.findOneAndUpdate(
                { _id: req.params.id },
                { $push: { elements: result.result.upserted } },
                function (error, success) {
                    if (error) {
                        res.status(500).send(error)
                    }
                    else
                        res.send(success)
                });
        });
});

/**
 * /theme/layout/:idLayout/title
 * Adds the appropriate title/subtitle/content elements
 */
router.post('/layout/:id/titles', function (req, res) {
    var title = req.body.title || null;
    var subtitle = req.body.subtitle || null;
    var content = req.body.content || null;
    let elements = []
    // not very good but does the job
    if (title !== null)
        elements = [...elements, title]
    if (subtitle !== null)
        elements = [...elements, subtitle]
    if (content !== null)
        elements = [...elements, content]

    Element.collection.insertMany(elements, (err, elements) => {
        if (err)
            res.status(500).send(err)
        else {
            Layout.findOneAndUpdate(
                { _id: req.params.id },
                { $set: { title: elements.insertedIds[0] || null, subtitle: elements.insertedIds[1] || null, content: elements.insertedIds[2] || null } },
                function (error, success) {
                    if (error) {
                        console.log(error)
                        res.status(500).send(error)
                    }
                    else
                        res.send(success)
                });
        }
    })
});

module.exports = router;