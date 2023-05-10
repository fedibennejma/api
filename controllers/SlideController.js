var ObjectId = require('mongodb').ObjectID;
var User = require('../models/User');
var Presentation = require('../models/Presentation');
var Slide = require('../models/Slide');
var Movement = require('../models/Presentation3D/Movement');
var Element = require('../models/Element');
var SlideStat = require('../models/SlideStat');
var mongoose = require('mongoose');
const { cloudinary } = require('../bin/cloudinary');

/*const assistantController = require("./AssistantController")
const presentationController = require("./PresentationController");*/

/**
 * Creates multiple slides for a user presentation
 * Called from the assistant
 * @param {*} slides 
 * @param {*} presentationId 
 * @param {*} userId 
 * 
 */
let createMultipleSlides = (slides, presentationId, userId) => {
    slides = slides.map(e => {return e.toObject()}) // important
    Slide.collection.insertMany(slides, (err, slides) => {
        if (err)
            return err
    })

    return Presentation.findOneAndUpdate(
        { _id: presentationId, user: userId },
        { $addToSet: { slides: slides } },
        function (error, success) {
            if (error)
                console.log(error);
            else
                return success
    }).populate({
        path: 'slides',
        match: { isDeleted: false },
        //select: '-svg', // temporarly disabled
        populate: [
            {
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false }
            }
        ],
    });
}

/**
 * Generates n slide models to be passed to createMultipleSlides function by the assistant.
 * @param {*} nb Number of generated slides
 */
let generateNbSlides = (nb) => {
    let slides = []
    nb = (nb !== undefined && !isNaN(nb)) ? nb : 1
    for(let i=0; i < nb; i++) {
        var slide = new Slide({
            rank: 0,
            // presentation: ObjectId(presentationId),
        });
        console.log('slideID: ', slide._id)
        slides.push(slide)
        console.log('slides.length ', slides.length)
    }
    return slides;
}

/**
 * NB: Maybe not used anymore for now
 * Creating slide for assistant, not for a http call! That needs different parameters in the slide model.
 * Used for the first slide creation when creating a presentation
 */
createSlide = (presentationId) => {
    var slide = new Slide({
        rank: 0,
        presentation: ObjectId(presentationId),
    });
    slide.save();
    Presentation.findById(ObjectId(presentationId), (err, presentation) => {
        if (err)
            return false
        presentation.slides.push(slide);
        presentation.save();
        return true
    });
}

updateSlideNotes = (req, res) => {
    Slide.findOneAndUpdate({ _id: req.body.id }, { note : req.body.note },{ new: true },(err, slide) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(slide)
    }).populate('elements');
};

/**
 * Inserts elements into a slide. If no slide is specified we add elements to the first slide of the presentation (or should be last?). Anyway, the first slide thing is used by the add title to a presentation.
 * Used by the assistant. Only difference (between this and the insertElements in the router) is in the element _id. This one doesn't need to be generated since we get already generated element ids from the assistantActionsController
 * @param {*} elements 
 * @param {*} presentationId used to get the first slide of the presentation if slideId is not specified
 * @param {*} slideId 
 */
let insertElements = (elements, presentationId, slideId) => {
    if (slideId === undefined || slideId === null) // if we don't specify a slideId we get the first one in the presentation
        getFirstSlide(presentationId).then((slides, err) => {
            if(slides.length) {
                slideId = (slides[0] !== null && slides[0] !== undefined) ? slides[0]._id : 0
                return insertElementsChildFunction(elements, slides[0]._id, presentationId)
            }
        })
    else {
        // the separation is only because of the asynchronous call in getFirstSlide.then
        return insertElementsChildFunction(elements, slideId, presentationId)
    }
}

/**
 * Adds or updates the elements in a slide.
 * PresentationId and client params have been added just for the setSelectedPresentation
 */
let insertElementsChildFunction = (elements, slideId, calledFromSlideRouter = false) => {
    if (!calledFromSlideRouter)
        elements = elements.map(e => { if (e) { return e.toObject()}}) // important
    return Element.bulkWrite(
        elements.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id },
                    update: element/*.toObject()*/,
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
    ))).then(res => {
            Slide.findOneAndUpdate(
                { _id: slideId },
                { $addToSet : { elements: elements } },
                (err, slide) => {
                    console.log(err)
                    console.log(slide)
                }
            )})
}

let getFirstSlide = (presentationId) => {
    return Slide.find({presentation: presentationId, isDeleted: false}, '_id').sort({ _id: 'ascending' }).limit(1).populate({
        path: 'elements',
        match: { isDeleted: false }
    })
}

/**
 * Updates an element by getting its id
 * @param {*} element 
 */
let updateElement = (element) => {
    element = element.toObject() // important
    if (element !== null && element !== undefined)
        return Element.findOneAndUpdate(
            { _id: element._id },
            element, {new: true})
}

/**
 * Returns a slide and its elements from slideId
 * @param {*} slideId 
 */
let getSlide = (slideId) => {
    return Slide.findById(slideId).populate('elements')
}

/**
 * Creates a SlideStat object when a user views a slide. We need it for statistics on each slide
 * @param {*} userId 
 * @param {*} slideId 
 */
let createStat = (req, res) => {
    let slideStat = new SlideStat({
        user: req.userId,
        slide: ObjectId(req.params.id),
        time: req.body.timer
    });
    slideStat.save((err, tag) => {
        if (err)
            res.status(500).send(err)
        res.send(slideStat)
    });
} 

let createSlide3D = async (req, res) => {
    try {
        const slideBG = req.body.imageUrl;
        const dimensions = req.body.dimensions;
        const presentationId = req.params.presentationId;
        const movementId = req.params.movementId;

        const uploadedResponse = await cloudinary.uploader.
            upload(slideBG, {
                upload_preset: 'tto6fni3',
                // width: dimensions && dimensions.width > 1500 ? 1500 : dimensions.width,
                timeout: 60000,
                quality: "auto",
            });
        let imgLink = injectImgLink(uploadedResponse.url, 'f_auto,q_auto');
        
        var slide = new Slide({
            svg: getSVG(imgLink),
            background: {
                image: {
                    source: imgLink,
                    size: 'middle'
                }
            },
            presentation: ObjectId(presentationId),
        });

        slide.save((err, slide) => {
            if (!err && slide) {
                Movement.findById(ObjectId(movementId), (err, movement) => {
                    if (err || !movement || movement === null) {
                        //res.status(500).json({ err: 'error' }); 

                        // maybe we don't want to break here
                    }
                    else {
                        movement.slide = ObjectId(slide._id);
                        movement.save();
                        res.send(slide)
                    }
                    
                });

                Presentation.findOneAndUpdate(
                    { _id: ObjectId(presentationId) },
                    { $addToSet: { slides: slide } },
                    { new: true },
                    (err, presentation) => {
                        //console.log(err, presentation)
                        //res.send(presentation)
                    }
                );
            } else
                res.status(500).json({ err: 'error' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
}

let linkSlideToMovement = (req, res) => {
    let presentationId = req.params.presentationId;
    let movement = req.body.mainMovement;
    console.log('movement', movement);
    let slideId = req.params.slideId;
    let movements = req.body.movements; // newly added (all the movements related to the slide, contains the main movement)

    // we search for the presentation first instead of getting the cameraId directly to check the user rights
    Presentation.findOne({_id: ObjectId(presentationId), type: 'presentation3D'/*, owners: req.userId*/}, (err, presentation) => {
        if (err || !presentation)
            return res.status(200)

        else if (presentation.cameraId && ObjectId.isValid(presentation.cameraId)) {
            Element.findOne({_id: ObjectId(presentation.cameraId)}, (err, camera) => {
                if (err || !camera)
                    return res.status(200);

                Movement.bulkWrite(
                    movements.map((copyMovement) => (
                        {
                            updateOne: {
                                filter: { _id: copyMovement._id },
                                update: { $set: copyMovement },
                                upsert: true, new: true, setDefaultsOnInsert: true
                            },
                        }
                    ))).then(() => {
                        Slide.findOneAndUpdate(
                            { _id: slideId },
                            { $set: { movement: movement?._id } },
                            (error, slide) => {
                                if (error || !slide)
                                    return result.send(error);

                                camera?._3DProperties?.movements ? (camera._3DProperties.movements = [...camera._3DProperties.movements, ...movements]) : camera._3DProperties.movements = [movement];

                                camera.save((err, element) => {
                                    if (err || !element)
                                        return res.status(500).send(err);

                                    return res.send(movement);
                                });
                            });
                })
            });
        } else {
            res.send('error ');
        }
    });
}

let injectImgLink = (link, injection) => {
    if (!link || link === null) return link;

    let linkParts = link.split('/');
    let imgName = linkParts[linkParts.length - 1];

    let baseURL = 'https://res.cloudinary.com/dg91u71x5/image/upload/';
    return baseURL + injection + '/' + imgName;
}

let getSVG = (imgLink) => {
    return '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="1090.56" height="613.4399999999999" viewBox="0 0 1920 1080" xml:space="preserve"> style="background: black;"' +
        '<desc>Created with Fabric.js 3.6.3</desc>' +
        '<defs>' +
        '</defs>' +
        '<g transform="matrix(1.28 0 0 1.28 960 540.16)">' +
        '<image style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;"  xlink:href="' + imgLink + '" x="-750" y="-422" width="1500" height="844"></image>' +
        '</g>' +
        '</svg>'
}

let updateSlideSVG = async (req, res) => {
    const slideId = req.params.slideId;
    const slideBG = req.body.imageUrl;

    const uploadedResponse = await cloudinary.uploader.
        upload(slideBG, {
            upload_preset: 'tto6fni3',
            // width: dimensions && dimensions.width > 1500 ? 1500 : dimensions.width,
            timeout: 60000,
            quality: "auto",
        });

    let imgLink = injectImgLink(uploadedResponse.url, 'f_auto,q_auto');

    Slide.findById(ObjectId(slideId), (err, slide) => {
        if (err || !slide)
            res.status(404).send()
        
        slide = new Slide({
            ...slide,
            svg: getSVG(imgLink),
            background: {
                image: {
                    source: imgLink,
                    size: 'middle'
                }
            },
        });

        slide.save((err, slide) => {
            if (err)
                res.status(500).send(err)
            res.send(slide)
        });
    });
}

let deleteSlide = (slideId, result) => {
    Slide.findOneAndUpdate(
        { _id: slideId },
        { $set: { isDeleted: true } },
        (error, slide) => {
            if (error)
                result.send(error);
            else if (slide.elements.length)
                Element.bulkWrite(
                    slide.elements.map((element) => (
                        {
                            updateOne: {
                                filter: { _id: element._id },
                                update: { $set: { isDeleted: true } },
                            },
                        }
                    ))).then((error, res) => {
                        if (error)
                            result.send(error);
                        else
                            result.send(res)
                    });
            else
                result.send(slide)
        })
}

module.exports = {
    createMultipleSlides: createMultipleSlides,
    generateNbSlides: generateNbSlides,
    insertElements: insertElements,
    updateElement: updateElement,
    getSlide: getSlide,
    getFirstSlide: getFirstSlide,
    createStat: createStat,
    createSlide3D: createSlide3D,
    updateSlideNotes: updateSlideNotes,
    updateSlideSVG: updateSlideSVG,
    linkSlideToMovement: linkSlideToMovement,
    deleteSlide: deleteSlide,
    insertElementsChildFunction: insertElementsChildFunction
}