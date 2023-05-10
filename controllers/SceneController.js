var ObjectId = require('mongodb').ObjectID;
var mongoose = require('mongoose');
var Movement = require('../models/Presentation3D/Movement');
var Action = require('../models/Presentation3D/Action');
var Presentation = require('../models/Presentation');
var Element = require('../models/Element');
var Scene = require('../models/Presentation3D/Scene');
var Slide = require('../models/Slide');
var MovementController = require('../controllers/MovementController')

/**
 * Creates a scene for 3D Presentation. But this is not very used. We will use mainly the copy of a scene.
 * This has multiple imbricated adds. Scene->elements->movements->actions
 * @param {*} req 
 * @param {*} res 
 */
exports.addScene = (req, res) => {
    const scene = new Scene({
        presentation: req.params.presentationId,
    });

    scene.save((err, scene) => {
        if (err)
            res.status(500).send(err)

        Presentation.findOneAndUpdate(
            { _id: req.params.presentationId },
            { $push: { scenes: scene } },
            (error, success) => {
                if (error)
                    res && res.status(500).send(err)
                else {
                    
                    if (req.body.elements) {
                        this.addElementsToScene(req.body.elements, scene._id); // we are doing 2 saves on the same model, I know
                    }

                    res && res.send(scene);
                }
        });
    })
}

/**
 * Copy of add a scene
 * @param {*} req 
 * @param {*} res 
 */
exports.updateScene = (req, res) => {
    Scene.findOneAndUpdate(
        { _id: req.body._id },
        { $set: { presentation: req.params.presentationId } },
        (err, scene) => {
        if (err)
            res.status(500).send(err)

        Presentation.findOneAndUpdate(
            { _id: req.params.presentationId },
            { $push: { scenes: scene } },
            (error, success) => {
                if (error)
                    res.status(500).send(err)
                else {
                    if (req.body.elements) {
                        this.addElementsToScene(req.body.elements, scene._id); // we are doing 2 saves on the same model, I know
                    }

                    res.send(scene);
                }
        });
    })
}

/**
 * Adds 3d elements to a scene
 * @param {*} elements 
 * @param {*} sceneId 
 */
exports.addElementsToScene = (elements, sceneId, response) => {
    let elementsMovement = [];
    let elementsUpdateId = []; // list where we will store the ids of the elements that have an id so that we can use them to add to the scene (since upserted doesn't include them)
    // we need to clean the movements array in the element so that it doesn't make an error when element is saved.
    // we save the movements array later in this function
    let elementsCleaned = elements.map(element => {
        element._id === undefined ? (element._id = mongoose.Types.ObjectId()) : elementsUpdateId.push({_id: ObjectId(element._id)});
        if (element._3DProperties.movements && element._3DProperties.movements.length)
            elementsMovement.push({ _id: element._id, movements: element._3DProperties.movements })
        delete element._3DProperties.movements;
        return element
    })

    Element.bulkWrite(
        elementsCleaned.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id },
                    update: { $set: element },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
        ))).then(res => {
            Scene.findOneAndUpdate(
                { _id: ObjectId(sceneId) },
                { $push: { elements: [...res.result.upserted, ...elementsUpdateId] } }, {new: true, upsert: true, rawResult: true}, 
                (error, scene) => {
                    elementsMovement.map(element => {
                        if (element._id && element.movements && element.movements.length) {
                            this.addMovementsToElement(element.movements, element._id)
                        }
                    })

                    if (response && !error) {
                        response.send(scene)
                    } else if (res && error) {
                        response.status(500).send(err)
                    }
                }
            )
        })
}

/**
 * Adds Movements to an Element
 * @param {*} elements 
 * @param {*} sceneId 
 */
 exports.addMovementsToElement = (movements, elementId) => {
    let movementsActions = []
    // we need to clean the actions array in the movements so that it doesn't make an error when movement is saved.
    // we save the actions array later in this function
    let movementsCleaned = movements.map(movement => {
        movement._id === undefined && (movement._id = mongoose.Types.ObjectId());
        movementsActions.push({ _id: movement._id, actions: movement.actions, slide: movement.slide })
        delete movement.actions;
        // delete movement.slide; // used to be in a seeder
        return movement
    })

    Movement.bulkWrite(
        movementsCleaned.map((movement) => (
            {
                updateOne: {
                    filter: { _id: movement._id },
                    update: { $set: movement },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
    ))).then(res => {
        Element.findOneAndUpdate(
            { _id: ObjectId(elementId) },
            { $push: { '_3DProperties.movements': movementsCleaned } },
            { new: true, upsert: true, rawResult: true }, 
            (error, element) => {}
        );

        movementsActions.map(movement => {
            if (movement._id && movement.actions && movement.actions.length) {
                MovementController.addActions(movement.actions, movement._id)
            }
            if (movement._id && movement.slide) {
                // used to be as a seeder
                // this.addSlideToMovement(movement.slide, movement._id)
            }
        })
    })
}

/**
 * (Not clear why we need it, maybe for copy?) Important: check this
 * Add Slide to Movement
 * @param {*} slide 
 * @param {*} movementId 
 */
exports.addSlideToMovement = (slide, movementId) => {
    if (slide.elements && slide.elements.length) {
        Element.bulkWrite(
            slide.elements.map((element) => (
                {
                    updateOne: {
                        filter: { _id: element._id || mongoose.Types.ObjectId() },
                        update: { $set: element },
                        upsert: true, new: true, setDefaultsOnInsert: true
                    },
                }
        ))).then(res => {
            slide.elements = res.result.upserted;
            delete slide._id;
            let newSlide = new Slide({
                ...slide
            });

            newSlide.save((err, slide) => {
                if (!err && slide) {
                    Movement.findOneAndUpdate(
                        { _id: movementId },
                        { $set: { slide: slide._id } },
                        (error, movement) => {})
                }
            })
        })
    }
}

/**
 * RQ: No movement is saved
 * Really similar to addElementsToScene
 * Different from addElementsToScene where this is exported as a route separately and sets the whole elements of a scene not adding one
 * @param {*} elements 
 * @param {*} sceneId 
 */
 exports.updateSceneElements = (elements, sceneId, response) => {
    let elementsMovement = [];
    let elementsUpdateId = []; // list where we will store the ids of the elements that have an id so that we can use them to add to the scene (since upserted doesn't include them)
    // we need to clean the movements array in the element so that it doesn't make an error when element is saved.
    // we save the movements array later in this function
    let elementsCleaned = elements.map(element => {
        (element._id === undefined || !ObjectId.isValid(element._id)) ? (element._id = mongoose.Types.ObjectId()) : elementsUpdateId.push({_id: ObjectId(element._id)});
        if (element._3DProperties.movements && element._3DProperties.movements.length)
            elementsMovement.push({ _id: element._id, movements: element._3DProperties.movements })
        delete element._3DProperties.movements;
        return element
    })

    Element.bulkWrite(
        elementsCleaned.map((element) => (
            {
                updateOne: {
                    filter: { _id: element._id },
                    update: { $set: element },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
        ))).then(res => {
            Scene.findOneAndUpdate(
                { _id: ObjectId(sceneId) },
                { $set: { elements: [...res.result.upserted, ...elementsUpdateId] } }, {new: true, upsert: true, rawResult: true}, 
                (error, scene) => {
                    elementsMovement.map(element => {
                        if (element._id && element.movements && element.movements.length) {
                            this.addMovementsToElement(element.movements, element._id)
                        }
                    })
                    //console.log([...res.result.upserted, ...elementsUpdateId], [...res.result.upserted, ...elementsUpdateId].length);
                    if (response && !error) {
                        response.send(scene)
                    } else if (res && error) {
                        response.status(500).send(err)
                    }
                }
            )
        })
}

exports.updateScenePostprocess = (req, res) => {
    Scene.findOneAndUpdate(
        { _id: req.params.sceneId },
        { $set: { postProcess: req.body.postprocess } },
        (err, scene) => {
        if (err || !scene)
            res.status(500).send(err)
        
        res.send(scene)
    })
}

/**
 * Used in the 2D editor to get images and 3D texts used in 3D
 */
exports.getScene = (req, res) => {
    Scene.findOne({_id: req.params.sceneId, isDeleted: false},
        (err, scene) => {
            if (err) {
                return res.status(500).send(err)
            } else
                return res.send(scene)
        }
    ).populate(
        {
            path: 'elements',
            model: 'Element',
            match: { isDeleted: false }
        }
    )
}

exports.updateElementSource = (req, res) => {
    Element.findOneAndUpdate(
        { _id: req.params.elementId },
        { $set: { '_3DProperties.source.normal': req.body.source } },
        (error, success) => {
            if (error)
                res.status(500).send(err)
            else {
                res.send(success)
            }
    });
}

exports.updateElementText = (req, res) => {
    Element.findOneAndUpdate(
        { _id: req.params.elementId },
        { $set: { 'layout.text.content': req.body.text } },
        (error, success) => {
            if (error)
                res.status(500).send(err)
            else {
                res.send(success)
            }
    });
}

exports.updateSceneMetallicOptions = (req, res) => {
    Scene.findOneAndUpdate(
        { _id: req.params.sceneId },
        { $set: { metallicOptions: req.body.metallicOptions } },
        (err, scene) => {
        if (err || !scene)
            res.status(500).send(err)
        
        res.send(scene)
    })
}

exports.updateSingleElementToScene = (req, res) => {
    let element = req.body.element;
    console.log('element?._id ', element?._id )
    if (element) {
        Element.findOneAndUpdate(
            { _id: element?._id },
            { $set: element },
            (err, success) => {
                if (err || !success)
                    return res.status(500).send(err)

                return res.send(success)
            })
    }
}

exports.addSingleElementToScene = (req, res) => {
    let element = req.body.element;
    let newElement = new Element({
        ...element
    })

    newElement.save((err, success) => {
        if (err)
            return res.status(500).send(err)


        Scene.findOneAndUpdate(
            { _id: req.params.sceneId },
            { $push: { elements: success } },
            (err, scene) => {
                if (err || !scene)
                    res.status(500).send(err)

                res.send(scene)
            })
    })
}