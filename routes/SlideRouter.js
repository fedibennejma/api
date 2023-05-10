/**
 * @author Fedi Ben Nejma
 * @email fedi.bennejma@esprit.tn
 * @create date 2021-02-03 11:46:37
 * @modify date 2022-02-14 12:19:17
 * @desc [description]
 */
var express = require('express');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();
var Slide = require('../models/Slide');
var Presentation = require('../models/Presentation');
var Element = require('../models/Element');
var Movement = require('../models/Presentation3D/Movement');
var Caption = require('../models/Caption');
var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');
const Theme = require('../models/Theme');
const slideController = require('../controllers/SlideController');
const statsController = require('../controllers/StatsController');
const authJwt = require('../middlewares/authJwt');
const ModelRepresentation = require('../util/ModelRepresentation');

/**
 * /slide/:presentationId
 * Adds a slide to a presentation
 */
router.post('/:id', [authJwt.verifyToken], function (req, res) {
    var slide = new Slide({
        rank: 0,
        svg: req.body.svg || '', // maybe add later default svg from template
        dimensions: req.body.dimensions,
        background: req.body.background,
        svg: req.body.svg, // why is this in double?
        presentation: ObjectId(req.params.id),
        templateStyle: req.body.slideStyle?.templateStyle,
        template: req.body.slideStyle?.template,
        templateSlide: req.body.slideStyle?.templateSlide
    });
    slide.save((err, slide) => {
        statsController.createStat({
            reference : slide._id,
            type : 'slide',
            parentId : null,
            userId: req.userId,
            isDuplicated: false  
        });
        // we search for the slide once it was added, I know, could be better, but I just wanted to use an existing function
        if (slide && req.body.slideStyle?.staticElements?.length)
            slideController.insertElementsChildFunction(req.body.slideStyle?.staticElements, slide._id, true)
    });

    Presentation.findById(ObjectId(req.params.id), (err, presentation) => {
        if (req.body.rank && req.body.rank > -1)
            presentation.slides.splice(req.body.rank, 0, slide)
        else if (presentation)
            presentation.slides.push(slide);

        presentation.lastSavedTime = Date.now()
        presentation.save();
        res.send(slide);
    });
});

/**
 * /slide/3d/:presentationId/:movementId
 * Adds a slide for 3d presentation (adds it to the movement not to the presentation itself)
 */
router.post('/3d/:presentationId/:movementId', slideController.createSlide3D);

/**
 * /slide/2d/:presentationId/:movementId
 * Adds a slide & movement from 2D editor for 3d presentation (adds it to the movement not to the presentation itself)
 */
router.post('/2d/:presentationId/:slideId', slideController.linkSlideToMovement);

/**
 * /slide/svg/:slideId
 * Updates SVG of a slide
 */
router.post('/svg/:slideId', slideController.updateSlideSVG);

/**
 * /slide/:slideId
 * Soft deletes a slide by its id and updates all its children elements to be soft deleted
 */
router.delete('/:id', (req, result) => {
    slideController.deleteSlide(req.params.id, result);
});

/**
 * Route: /slide/element/:slideId
 * Adds or updates a list of elements and assign them to a slide by its id
 */
 router.post('/element/:id', [authJwt.verifyToken], (req, result) => {
    var passedParams = req.body;
    var elements = passedParams.elements;
    var svg = passedParams.svg;
    var background = passedParams.background;
    var layout = passedParams.layout
    var templateSlide = passedParams.templateSlide;
    var template = passedParams.template;
    var templateStyle = passedParams.templateStyle;

    if (elements && !elements.length)  {
        return updateSlideElements(req.params.id, [], svg, background, template, templateSlide, templateStyle, result);
    };

    Element.bulkWrite(
        elements.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id || mongoose.Types.ObjectId() },
                    update: { $set: element },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
    ))).then(res => {
            updateSlideElements(req.params.id, elements, svg, background, template, templateSlide, templateStyle, result);
    });
    statsController.updateStat({
        reference : ObjectId(req.params.id)
    });
});

/**
 * /slide/:slideId/:movementId
 * Soft deletes a 3D slide and movement
 */
router.post('/:id/:movementId', (req, result) => {
    let movements = req.body.movements;

    if (movements?.length) {
        Movement.bulkWrite(
            movements.map((movement) => (
                {
                    updateOne: {
                        filter: { _id: movement._id },
                        update: { $set: { isDeleted: true } },
                        upsert: true, new: true, setDefaultsOnInsert: true
                    },
                }
        ))).then((res) => {
            if (res) {
                slideController.deleteSlide(req.params.id, result);
            } else {
                // maybe a notif to the admin dashboard?
                result.send('error deleting movements');
            }
        })
    }
    else  // just in case
        Movement.findOneAndUpdate(
            { _id: req.params.movementId },
            { $set: { isDeleted: true } },
            (error, movement) => {
                if (error)
                    result.send(error);

                else if (movement) {
                    slideController.deleteSlide(req.params.id, result);
                } else if (!movement) {
                    result.send('error deleting movement');
                }
            })
});

/**
 * /slide/multiple/:slideId
 * NOT USED: Adds multiple slides (maybe for synching later)
 * Maybe used in assistant
 */
router.post('/multiple/:id', function (req, res) {
    var slides = req.body;

    Slide.collection.insertMany(slides, (err, slides) => {
        if (err)
            res.send(err);
        res.send(slides)
    })

    Presentation.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { slides: slides } },
        function (error, success) {
            if (error)
                console.log(error);
            else
                console.log(success);
    });
});

updateSlideElements = (id, elements, svg, background, template, templateSlide, templateStyle, result) => {
    Slide.findOneAndUpdate(
        { _id: id },
        { $set: { elements: elements, svg: svg, background: background, template: ObjectId(template), templateSlide: ObjectId(templateSlide), templateStyle: templateStyle} },
        (error, success) => {
            if (error)
                result.send(error);
            else {
                if(success?.presentation) {
                    Presentation.findOneAndUpdate({_id: ObjectId(success.presentation)}, { lastSavedTime: Date.now() }, (err, presentation) => {
                        if (err)
                        {
                            console.error('error updating lastSavedTime presentation')
                        } else {
                            result.send(success);
                        }
                    })
                }
                // old theme

                // to avoid heavy calls on the db, we only fetch and update the presentation if we specify a theme
                /*if (theme !== undefined && success.presentation !== null && success.presentation !== undefined) {
                    Presentation.findOneAndUpdate({_id: ObjectId(success.presentation)}, { $set: {theme: theme}}, (err, success) => {
                        if (err)
                            console.log('error updating theme in presentation')
                        else
                            console.log('success updating theme to', theme)
                    })
                }*/
            }
        }).populate({
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false }
            });
}

/**
 * /slide/:slideId/stat
 * Adds a stat to the slide when viewing it by a user
 */
router.post('/:id/stat', [authJwt.verifyToken], slideController.createStat);

/**
 * Route: /caption/:slideId
 * Adds or updates a list of captions and assign them to a slide by its id
 */
router.post('/caption/:id', (req, result) => {
    var passedParams = req.body;
    // var captions = passedParams.captions;
    var captions = [
        {
            value: 'First we will start with the introduction.',
            start: {
                startTime: 1200,
                duration: 2000,
                endTime: 0,
            },
            slideId: req.params.id
        },
        {
            value: 'Next, for the project context we will',
            start: {
                startTime: 3300,
                duration: 1700,
                endTime: 0,
            },
            slideId: req.params.id
        },
        {
            value: 'talk about the objectives, the organisation host, a study of the existing and finally our solution',
            start: {
                startTime: 4800,
                duration: 3700,
                endTime: 0,
            },
            slideId: req.params.id
        },
    ];

    Caption.bulkWrite(
        captions.map((caption) => (
            {
                updateOne: {
                    filter: { _id: caption._id || mongoose.Types.ObjectId() },
                    update: { $set: caption },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
        ))).then(res => {
            Slide.findOneAndUpdate(
                { _id: req.params.id },
                { $push: { captions: res.result.upserted } },
                (error, success) => {
                    if (error)
                        result.send(error);
                    else
                        result.send(success);
                }).populate('Captions');
        });
});

/**
 * Route: /slide/element/seed/:slideId
 * Temporary: seeder for elements of a slide (for testing etc)
 */
router.post('/element/seed/:id', (req, result) => {
    var elements = [{
        id: 0,
        rank: 1,
        type: 'text',
        layout: {
            position: {
                left: 0,
                top: 0,
                angle: 0,
            },
            scale: {
                x: 1,
                y: 1,
            },
            text: {
                content: '',
                placeholder: 'Click to add subtitle',
                font: {
                    color: 'rgba(1,0,1,0.58)',
                    align: 'center',
                    family: 'Open Sans',
                    weight: '',
                    size: 25,
                    isUnderlined: false,
                    isItalic: false,
                },
            },
            centerObject : {
                center: true,
                offset: {
                    top: 50,
                    left: 0,
                }
            },
            animation: {
                name: 'opacity',
                from: 0,
                value: 1,
                duration: 500,
            }
        },
    },
    {
        id: 1,
        rank: 0,
        type: 'text',
        layout: {
            position: {
                left: 0,
                top: 0,
            },
            text: {
                content: '',
                placeholder: 'Click to add Title',
                font: {
                    color: 'rgba(1,0,1,1)',
                    align: 'center',
                    family: 'Open Sans',
                    weight: 'SemiBold',
                    size: 40,
                    isUnderlined: false,
                    isItalic: false,
                },
            },
            scale: {
                x: 1,
                y: 1,
            },
            centerObject : {
                center: true,
                offset: {
                    top: 0,
                    left: 0,
                }
            },
            animation: {
                name: 'opacity',
                from: 0,
                value: 1,
                duration: 1500,
            }
        },
    }];
    Element.bulkWrite(
        elements.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id || mongoose.Types.ObjectId() },
                    update: { $set: element },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
        ))).then(res => {
            Slide.findOneAndUpdate(
                { _id: req.params.id },
                { $push: { elements: res.result.upserted } },
                (error, success) => {
                    if (error)
                        result.send(error);
                    else
                        result.send(success);
                }).populate('elements');
        });
});

router.get('/', function (req, res) {
    Slide.find({}, function (err, slides) {
        res.send(slides)
    }).populate('elements');
})

router.put('/seeder', function (req, res) {
    Slide.updateMany({}, {$set:  { isDeleted: false } },
        function (error, success) {
            if (error)
                console.log(error);
            else
                console.log(success);
    });
})

router.put('/slide/:id/elements/width', function (req, res) {
    Slide.updateMany({}, {$set: { isDeleted: false } },
        function (error, success) {
            if (error)
                console.log(error);
            else
                console.log(success);
    });
})

router.get('/element/:id', function (req, res) {
    Element.find({ slide: req.params.id }, function (err, elements) {
        res.send(elements)
    });
})

router.get('/:id', function (req, res) {
    Slide.findById({ _id: req.params.id }, function (err, slide) {
        res.send(slide)
    }).populate('elements');
})

router.put('/note', slideController.updateSlideNotes)

/**
 * Get all slide from presentation or template
 */
 router.get('/presentationSlides/:id',[authJwt.verifyToken], (req, res) => {
    Presentation.findById(ObjectId(req.params.id), (err, presentation) => {
        if ((presentation?.type === 'presentation3D' || presentation?.type === 'template3D') && presentation.scenes)
            res.send({
                scenes: presentation.scenes,
                slides: presentation.slides,
                name: presentation.name
            });
        else if(presentation?.slides) {
            res.send({
                slides: presentation.slides,
                name: presentation.name
            });
        } else {
            console.log('err', err)
            res.status(500).send(err)
        }
    }).populate([
        ModelRepresentation.slide(),
        ModelRepresentation.scenes(),
    ]);
});

module.exports = router;
