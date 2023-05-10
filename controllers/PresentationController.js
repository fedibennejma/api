var ObjectId = require('mongodb').ObjectID;
var User = require('../models/User');
var Presentation = require('../models/Presentation');
var Slide = require('../models/Slide');
const SlideController = require('./SlideController');
var Element = require('../models/Element');
var Scene = require('../models/Presentation3D/Scene');
var Movement = require('../models/Presentation3D/Movement');
var Action = require('../models/Presentation3D/Action');
var Folder = require('../models/Folder');
const Workspace = require('../models/Workspace');
const Notification = require('../models/Notification');
var mongoose = require('mongoose');
const MailController = require('./MailController');
const historyController = require("../controllers/HistoryController");
const ModelRepresentation = require('../util/ModelRepresentation');
const SceneController = require("../controllers/SceneController");
const statsController = require('../controllers/StatsController');
const { default: axios } = require('axios');

let createPresentation = async (req, res) => {
    let { owners, workspace } = req.body;
    let arrayOwners = [];
    if (owners) {
        owners.push(ObjectId(req.userId))
        arrayOwners = owners;
    } else {
        arrayOwners.push(ObjectId(req.userId));
    }
    var presentation = new Presentation({
        name: req.body.name,
        description: req.body.description,
        creationDate: Date.now(),
        lastSavedTime: Date.now(),
        sideVideo: req.body.sideVideo,
        private: req.body.private,
        live: req.body.live,
        type: req.body.type,
        thumbnail: {},
        user: req.body.userId,
        isAuthorAI: req.body.isAuthorAI,
        workspace: req.body.workspace,
        owners: arrayOwners
    })

    await presentation.save(function (err, presentation) {
        if (err)
            console.log(err)
        else {
            createSlideAndAffectToworkspace(workspace, presentation);
        }
        return presentation
    })
    // should only be returned if there is no error
    return presentation
}

/**
 * Method used to create slide and affect presentation to a workspace
 * Added scene creation for 3D
 */
createSlideAndAffectToworkspace = (workspace, presentation) => {
    // affect presentation to workspace
    Workspace.findOneAndUpdate({ _id: ObjectId(workspace._id) }, { $addToSet: { presentations: presentation } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {
    });

    // we add a scene for a 3D presentation
    if (presentation.type === 'template3D' || presentation.type === 'presentation3D') {
        // we are simulating the req body and params so that we don't rewrite the function
        SceneController.addScene({
            params: {
                presentationId: presentation._id
            },
            body: {
                elements: [
                    {
                        _3DProperties: {
                            type: 'camera'
                        }
                    }
                ]
            } 
        });
    } else { // we add the first slide to the presentation 
        var slide = new Slide({
            rank: 0,
            presentation: ObjectId(presentation._id),
        });
        slide.save((err, slide) => {
            if (err)
                console.log(err)
            else {
                presentation.slides.push(slide);
                presentation.save();
            }
        });
    }
}

/**
 * Create presentation by user and not with the assistant
 * @param {*} req 
 * @param {*} res 
 */
let createPresentationByUser = (req, res) => {
    let { owners, workspace } = req.body.presentation;
    let { folderSlug } = req.body;
    let arrayOwners = [];
    let arrayVisitors = [];
    if (owners) {
        owners.push(ObjectId(req.userId))
        owners.map((owner, index) => {
            if (owner.isVisitor) {
                arrayVisitors.push(owner);
                owners.splice(index, 1);
            }
        });
        arrayOwners = owners;
    } else {
        arrayOwners.push(ObjectId(req.userId));
    }
    var presentation = new Presentation({
        name: req.body.presentation.name,
        description: req.body.presentation.description,
        creationDate: Date.now(),
        lastSavedTime: Date.now(),
        sideVideo: req.body.presentation.sideVideo,
        private: req.body.presentation.private,
        live: req.body.presentation.live,
        type: req.body.presentation.type,
        user: req.userId,
        isAuthorAI: req.body.presentation.isAuthorAI,
        workspace: req.body.presentation.workspace,
        owners: arrayOwners,
        visitors: arrayVisitors
    })
    presentation.save(function (err, newPresentation) {
        if (err) {
            console.log(err)
            res.status(500)
        }
        else {
            if(folderSlug) {
                Folder.findOneAndUpdate({ slug: folderSlug, user: req.userId, isDeleted: false }, { $addToSet: { presentations: newPresentation } }, { new: true }, function (err, result) {
                    if (err)
                        res.send(err)
                    else {
                        if(result) {
                            console.log('affected')
                        } else {
                            console.log('not affected')
                            res.status(500).send('not authorized');
                        }
                    }
                })
            }
            createSlideAndAffectToworkspace(workspace, newPresentation);
            historyController.createHistory({
                workspaceId: workspace._id,
                presentationId: newPresentation._id,
                action: 'Add',
                actionDescription: 'PRESENTATION_CREATION',
                type: 'Presentation',
                targetId: newPresentation._id,
                sender: req.userId
            });
            statsController.createStat({
                reference : newPresentation?._id,
                type : 'presentation',
                parentId : null,
                userId: req.userId,
                isDuplicated: false
            });
            newPresentation.populate({
                path: 'user',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }, () => {
                res.send(newPresentation)
            })
        }
    })
}

/**
 * Gets the nth valid presentation for a user
 * @param {*} userId
 * @param {*} number
 */
let getPresentationByNumber = (userId, number) => {
    let skipValue = Math.max(0, parseInt(number) - 1) // since the users generally don't know that counting in arrays starts with 0 we remove 1 + we avoid having a negative skip value
    // case where the skipVlue is a string (because its  parseInt(number) is NaN) means that it probably contains a 'last' or 'first' command
    if (Number.isNaN(skipValue))
        return checkIfLastorFirst(number, userId) // returns the last or first valid presentation depending on skipVlue
    return Presentation.findOne({ user: userId, isDeleted: false }, '_id name slides').sort({ _id: 'ascending' }).skip(skipValue).populate({
        path: 'slides',
        match: { isDeleted: false },
        select: '-svg',
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
 * checks if input string contains 'last' or 'first' substring and makes the right db call for latest or oldest presentation
 * @param {*} input
 * @param {*} userId
 */
let checkIfLastorFirst = (input, userId) => {
    let isLast = input.includes('last') ? true : input.includes('first') ? false : undefined
    return getLastorFirstUserPresentation(userId, isLast)
}

/**
 * Sorts the user presntation documents depending on isLast parameter
 * @param {*} userId
 * @param {*} isLast
 */
let getLastorFirstUserPresentation = (userId, isLast) => {
    let sortBy = isLast ? -1 : 1
    return Presentation.findOne({ user: userId, isDeleted: false }, '_id name').sort({ _id: sortBy }).populate({
        path: 'slides',
        match: { isDeleted: false },
        //select: '-svg',
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
 * Soft deletes a presentation (the user has to be the owner)
 */
let deletePresentation = async (userId, presentationId) => {
    return Presentation.findOneAndUpdate(
        { _id: presentationId, user: userId },
        { $set: { isDeleted: true } },
        (error, presentation) => {
            if (error)
                return 'error while deleting this presentation';
            else if (presentation !== null) {
                Workspace.findOneAndUpdate({ _id: ObjectId(presentation.workspace) }, { $pull: { presentations: ObjectId(presentation._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => { })
                historyController.createHistory({
                    workspaceId: presentation.workspace._id,
                    presentationId: presentation._id,
                    action: 'Delete',
                    actionDescription: 'PRESENTATION_DELETE',
                    type: 'Presentation',
                    targetId: presentation._id,
                    sender: userId
                });
                return presentation._id
            }
            else
                'error deleting presentation. It may not exist or you may not be the presentation owner'
        })
}

/**
 * Sets a selected presentation title for the assistant and checks if the user is the owner.
 * Also ued for the update title endpoint
 * @param {*} userId 
 * @param {*} presentationId 
 * @param {*} title 
 */
let setPresentationTitle = (userId, presentationId, title) => {
    title === '' && (title = 'untitled presentation') // to ensure the default 'untitled presentation' gets set 
    return Presentation.findOneAndUpdate(
        { _id: presentationId, user: userId },
        { $set: { name: title } },
        { new: true })
}


/**
 * Sets presentation privacy
 * @param {*} userId 
 * @param {*} presentationId 
 * @param {*} value 
 */
 let setPresentationPrivacy = (userId, presentationId, value) => {
    return Presentation.findOneAndUpdate(
        { _id: presentationId, user: userId },
        { $set: { private: value } },
        { new: true })
}

/**
 * Copies a presentation and its slides and elements.
 * Used mainly for templating but can also be used by the user
 * @param {*} req 
 * @param {*} res 
 */
let copyPresentation = async (req, res) => {
    let presentationId = req.params.id;
    let populate = [ModelRepresentation.slide(true)];
    Presentation.findById({ _id: presentationId }, function (err, presentation) {
        // TODO: add condition where the presentation type is template, we let it go through directly
        if (presentation !== null && presentation !== undefined && !presentation.isDeleted /*&& (!presentation.private || presentation.invitations.indexOf(req.userId) !== -1)*/) {
            let isTemplate = presentation.type === 'template' || presentation.type === 'template3D'
            let isTemplateAndTitleExists = isTemplate && req.body.title !== undefined
            // we check if we're clonoig a template and if the user specified a title or if we're just copying another presentation
            let presentationName = (isTemplateAndTitleExists) ? req.body.title : ((isTemplate) ? presentation.name : 'copy of ' + presentation.name)

            if (req.keepName) {
                presentationName = presentation.name
            }

            let type = 'presentation';
            if (presentation.type === 'template3D') type = 'presentation3D'; // to avoid copying the template type
            else if (presentation.type === 'template') type = 'presentation';
            else type = presentation.type

            
            let originalType = presentation.type
            var copyPresentation = new Presentation({
                name: presentationName,
                user: req.userId,
                creationDate: Date.now(),
                lastSavedTime: Date.now(),
                type: type,
                owners: [req.userId],
                workspace: req.body.workspaceId ? req.body.workspaceId : presentation.workspace,
                theme: isTemplate ? presentationId : undefined, // templateId
            })

            if (copyPresentation.type !== 'presentation3D' && copyPresentation.type !== 'template3D') {
                // we go through the slides and clean them from their previous ids, presentationInd etc
                if(req.body.isCopie) {
                    copyPresentation.slides.push(copySlideAndElements(presentation.slides[0], copyPresentation, res, undefined, undefined, presentationId));
                } else {
                    copyPresentation.slides = copySlidesAndElements(presentation.slides, copyPresentation);
                }
                copyPresentation.slides.length && insertSlides(copyPresentation.slides, copyPresentation._id, res);
            }
            else { // case 3D pres or template, we will get the slides from the movments
                copyPresentation.slides = [];
                populate = [...populate, ModelRepresentation.scenes()];
            }

            // we go through the scenes array and their children elements if they exist
            copyPresentation.scenes = presentation.scenes.map((scene, index) => {
                if (!scene || typeof scene === 'string' || index >= 1) return;
                scene = scene.toObject()
                delete scene._id
                delete scene.creationDate
                // we clean the elements from their previous _id and affect new ones to them
                scene.elements = scene.elements.map((element) => {
                    // we keep originalId in case it's a template
                    if (presentation.type === 'template3D') {
                        element._3DProperties.originalId = element._id;
                    } else {
                        element._3DProperties.originalId = element._3DProperties.originalId ;
                    }

                    // solution to avoid _id problems, reference errors etc, we create an entirely new document
                    delete element._id;
                    delete element.creationDate;

                    movements = element._3DProperties.movements.map((movement,indexMovement) => {
                        if(req.body.isCopie && copyPresentation?.slides?.length >= 1) return;
                        delete movement._id;
                        delete movement.creationDate;
                        let movementId = mongoose.Types.ObjectId();
                        if (movement.slide) {
                            movement.slide = copySlideAndElements(movement.slide, copyPresentation, res, true, movementId);
                            copyPresentation.slides = [...copyPresentation.slides, movement.slide]; // we push the same slide in the presentation slides
                            insertSlides([movement.slide], copyPresentation._id, res);
                        }

                        if (movement.actions) {
                            movement.actions = movement.actions.map(action => {
                                if (!action || action === null || typeof action === 'string') return;

                                // action = action.toObject();
                                delete action._id;
                                delete action.creationDate;

                                action = new Action({
                                    ...action
                                });

                                return action;
                            })

                            movement.actions && movement.actions.length && Action.collection.insertMany(movement.actions);
                        }

                        let movementsave = new Movement({
                            _id: movementId,
                            ...movement
                        });

                        movementsave.save();
                        return movementsave;
                    });

                    //movements && movements.length && Movement.collection.insertMany(movements);
                    element._3DProperties.movements = movements;
                    element = new Element({
                        ...element,
                    });

                    if (element?._3DProperties?.type == 'camera') {
                        copyPresentation.cameraId = element._id;
                    }

                    return element;
                })
                // we insert these new elements directly from here instead of from where we'll be inserting the slides
                // since we would need to map through the slides again there, and it wouldn't be necessary since we can use this loop now
                // NB: but could cause a problem if there is an error in insertion we wouldn't notice it here

                scene.elements.length && insertElements(scene.elements).then((elements, error) => {
                    if (error && res)
                        res.status(500)
                })

                let newScene = new Scene({
                    ...scene
                });

                newScene.save();
                return newScene;
            })

            // add line here inserManyScene
            //copyPresentation.scenes.length && insertScenes([copyPresentation.scenes[0]])

            copyPresentation.save().then(presentation => {
                // affect presentation to workspace
                Workspace.findOneAndUpdate({ _id: ObjectId(presentation.workspace._id) }, { $addToSet: { presentations: presentation } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {});
                if(req.body.folderSlug) {
                    Folder.findOneAndUpdate({ slug: req.body.folderSlug, user: req.userId, isDeleted: false }, { $addToSet: { presentations: presentation } }, { new: true }, function (err, result) {
                        if (err)
                            res.send(err)
                        else {
                            if(result) {
                                console.log('affected')
                            } else {
                                res.status(500).send('not authorized');
                            }
                        }
                    })
                }
                historyController.createHistory({
                    workspaceId: presentation.workspace._id,
                    presentationId: presentation._id,
                    action: 'Add',
                    actionDescription: 'PRESENTATION_COPIED',
                    type: 'Presentation',
                    targetId: presentation._id,
                    sender: req.userId
                });
                if(req.body.isCopie) {
                    statsController.createStat({
                        reference : presentation._id,
                        type : originalType,
                        parentId : presentationId,
                        userId: req.userId,
                        isDuplicated: false
                    });
                } else {
                    statsController.createStat({
                        reference : presentation._id,
                        type : originalType,
                        parentId : presentationId,
                        userId: req.userId,
                        isDuplicated: true
                    });
                }
                res && res.send(presentation)
            })
                .catch(error => {
                    res && res.status(500)
                })
        }
    }).populate(
        [{
            path: 'slides',
            match: { isDeleted: false },
            populate: [
                {
                    path: 'elements',
                    model: 'Element',
                    match: { isDeleted: false }
                },
                {
                    path: 'captions',
                    model: 'Caption',
                }
            ]
        },
        {
            path: 'scenes',
            match: { isDeleted: false },
            populate:
            {
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false },
                populate:
                {
                    path: '_3DProperties.movements',
                    model: 'Movement',
                    match: { isDeleted: false },
                    populate: [
                        {
                            path: 'actions',
                            model: 'Action',
                            match: { isDeleted: false },
                        },
                        {
                            path: 'slide',
                            model: 'Slide',
                            match: { isDeleted: false },
                            populate: {
                                path: 'elements',
                                model: 'Element',
                                match: { isDeleted: false },
                            }
                        }
                    ]
                }
            }

        }
        ]
    )
}


/**
 * Copies a template presentation and its slides and elements.
 * @param {*} req 
 * @param {*} res 
 */
let copyTemplate = (req, res) => {
    const { template, workspace,folderSlug } = req.body;
    copyPresentation({ params: { id: template._id }, body: { title: 'Untitled presentation', workspaceId: workspace._id, folderSlug, isCopie : true }, userId: req.userId }, res);
}

/**
 * Copies a presentation and its slides and elements from folder.
 * @param {*} req 
 * @param {*} res 
 */
let copyPresentationFolder = (req, res) => {
    const { presentationId, folderSlug } = req.body;
    copyPresentation({ params: { id: presentationId }, body : { folderSlug }, userId: req.userId }, res);
}

/**
 * Inserts slides in bulk
 * @param {*} slides 
 */
let insertSlides = (slides) => {
    return Slide.collection.insertMany(slides)
}

/**
 * Inserts elements in bulk
 * @param {*} elements 
 */
let insertElements = (elements) => {
    return Element.collection.insertMany(elements)
}

/**
 * Inserts scenes in bulk
 * @param {*} scenes
 */
let insertScenes = (scenes) => {
    Scene.collection.insertMany(scenes)
}

let getPresentationById = (presentationId) => {
    return Presentation.findById(presentationId).populate({
        path: 'slides',
        match: { isDeleted: false },
        //select: '-svg',
        populate: [
            {
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false }
            }
        ],
    });
}

let getPresentationByIdOwner = (presentationId, userId) => {
    return Presentation.findOne({ _id: presentationId, owners: userId }).populate({
        path: 'slides',
        match: { isDeleted: false },
        //select: '-svg',
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
 * Mainly used for the socket live
 * @param {*} presentation 
 * @param {*} userId used instead of the middleware for auth
 * @param {*} live 
 */
let setPresentationLive = (presentationId, live) => {
    return Presentation.findOneAndUpdate(
        { _id: presentationId },
        { $set: { live: live } },
        { new: true }
    )
}

/**
 * Adds an owner to a presentation
 * @param {*} presentationId 
 * @param {*} userId 
 * @param {*} ownerId 
 * @returns 
 */
let addPresentationOwner = (presentationId, userId, owner, res) => {
    let ownerId = ObjectId(owner._id);
    Presentation.findOneAndUpdate(
        { _id: presentationId, owners: userId },
        { $push: { owners: ownerId } },
        { new: true },
        (error, presentation) => {
            if (presentation !== null) {
                let notification = new Notification({
                    type: 'Presentation',
                    sender: userId,
                    receiver: ownerId,
                    targetId: presentationId,
                    name: 'Collaboration on a presentation',
                    description: 'invited you to collaborate on a presentation'
                })

                notification.save();

                // we find the logged user so that we can add his/her details in the mail
                User.findById(userId, (err, user) => {
                    if (user) {
                        MailController.sendMailInivitationCollaboration({ sender: user, receiver: owner, presentation }, res)
                        historyController.createHistory({
                            workspaceId: presentation.workspace._id,
                            presentationId: presentation._id,
                            action: 'Add',
                            actionDescription: 'ADD_USER_TO_PRESENTATION',
                            type: 'Presentation',
                            targetId: presentation._id,
                            sender: user._id,
                            receiver: owner._id
                        });
                    }
                }).select('login userName profilePicture')
                res.send(200)
            } else
                res.status(500).send()
        }).populate({
            path: 'slides',
            match: { isDeleted: false },
            options: { limit: 1 }
        });
}

let deletePresentationOwner = (presentationId, userId, owner, res) => {
    Presentation.findOneAndUpdate(
        { _id: presentationId, owners: userId },
        { $pull: { owners: owner } },
        { new: true },
        (error, presentation) => {
            if (presentation !== null) {
                let notification = new Notification({
                    type: 'Presentation',
                    sender: userId,
                    receiver: owner,
                    targetId: presentationId,
                    name: 'Deleted collaboration on a presentation',
                    description: 'removed you from collaboration on a presentation'
                })
                notification.save();
                historyController.createHistory({
                    workspaceId: presentation.workspace._id,
                    presentationId: presentation._id,
                    action: 'Delete',
                    actionDescription: 'DELETE_USER_TO_PRESENTATION',
                    type: 'Presentation',
                    targetId: presentation._id,
                    sender: userId,
                    receiver: owner._id
                });
                res.send(200)
            } else
                res.status(500).send()
        })
}

let reorderPresentationSlides = (req, res) => {
    if (req.body.slides === null || req.body.slides === undefined || !req.body.slides.length) return res.status(500).send() // in case we have wrong input in the front

    let slides = req.body.slides;
    let presentationId = req.params.id;
    let slidesMovements = req.body.slidesMovements;
    Presentation.findOneAndUpdate(
        { _id: presentationId, owners: req.userId },
        { $set: { slides: slides } },
        { new: true },
        (error, presentation) => {
            if (error && presentation === null) {
                return res.status(500).send(err)
            } else {
                if (slidesMovements?.length && presentation?.cameraId) {
                   slidesMovements = slidesMovements.map(mov => {return ObjectId(mov)})
                    Element.findOneAndUpdate(
                        { _id: ObjectId(presentation?.cameraId) },
                        { $set: { '_3DProperties.movements': slidesMovements } },
                        { new: true, upsert: true, rawResult: true }, 
                        (error, element) => {
                            if (error)
                                return res.status(500).send(error)
                            if (element) {
                                return res.send('success')
                            }
                        }
                    );
                } else 
                    return res.send('success')
            }
        })
}

let saveSlideAndElements = (copySlide, presentationId, rank) => {
    copySlide.elements.length && insertElements(copySlide.elements).then((elements, error) => {
        if (error)
            console.error(error)
    });
    copySlide.save(function (err, newSlide) {
        if (err) {
            console.error(error)
        } else {
            Presentation.findById(ObjectId(presentationId), (err, presentation) => {
                const array = presentation.slides;
                array.splice(rank, 0, newSlide);
                presentation.slides = array;
                presentation.save();
            });
        }
    });
}

let duplicatePresentationSlides = (req, res) => {
    if (req.body.presentationId === null || req.body.presentationId === undefined || req.body.slideId === null || req.body.slideId === undefined || req.body.rank === null || req.body.rank === undefined) return res.status(500).send() // in case we have wrong input in the front

    Slide.findOne({ _id: req.body.slideId }, (error, slide) => {
        if (!error && slide !== null) {
            slide = slide.toObject()
            delete slide._id
            delete slide.presentation
            delete slide.creationDate
            delete slide.movement
            // we clean the elements from their previous _id and affect new ones to them
            slide.elements = slide.elements.map((element) => {
                // solution to avoid _id problems, reference errors etc, we create an entirely new document
                delete element._id
                return new Element({
                    ...element,
                })
            })

            let movementId = req.body.movementId
            // copy movement if it exists
            if (movementId) {
                Movement.findOne({ _id: movementId }, (err, movement) => {
                    if (err || !movement)
                        return res.status(500).send()

                    let copyMovement = movement;
                    delete copyMovement._id;
                    delete copyMovement.slide;
                    copyMovement = new Movement({
                        ...copyMovement
                    });
                    copyMovement.save(); // normally we should check if it was saved THEN add the slide, but since we use the same function for two cases we can't
                    slide.movement = movement;
                })
            }

            const copySlide = new Slide({
                ...slide,
                presentation: req.body.presentationId,
            });
            saveSlideAndElements(copySlide, req.body.presentationId, req.body.rank);
            statsController.createStat({
                reference : copySlide?._id,
                type : 'slide',
                parentId : req.body.slideId,
                userId: req.userId,
                isDuplicated: true
            });
            res.send(copySlide);
        } else {
            res.status(500).send()
        }
    }).populate([
        {
            path: 'elements',
            model: 'Element',
            match: { isDeleted: false }
        },
        {
            path: 'captions',
            model: 'Caption',
        }
    ]);
}

let applyAllLayoutSlides = async (req, res) => {
    let templateId = req.body.templateId;
    let presentationId = req.body.presentationId;

    getPresentationByIdOwner(presentationId, req.userId).then(presentation => {
        if (!presentation) return res.status(500);

        Presentation.findById({ _id: templateId }, (err, template) => {
            if (!template || template?.isDeleted) return res.status(500);
            
            let slides = copySlidesAndElements(template.slides, presentation, res, undefined, undefined, templateId)
            
            if (presentation?.slides?.length)
                presentation.slides = [...presentation.slides, ...slides]
            else 
                presentation.slides = slides

            slides?.length && insertSlides(slides);

            presentation.save();
            res.send(slides);
        }).populate(
            [{
                path: 'slides',
                match: { isDeleted: false },
                populate: [
                    {
                        path: 'elements',
                        model: 'Element',
                        match: { isDeleted: false }
                    },
                    {
                        path: 'captions',
                        model: 'Caption',
                    }
                ]
            },
            {
                path: 'scenes',
                match: { isDeleted: false },
                populate:
                {
                    path: 'elements',
                    model: 'Element',
                    match: { isDeleted: false },
                    populate:
                    {
                        path: '_3DProperties.movements',
                        model: 'Movement',
                        match: { isDeleted: false },
                        populate: [
                            {
                                path: 'actions',
                                model: 'Action',
                                match: { isDeleted: false },
                            },
                            {
                                path: 'slide',
                                model: 'Slide',
                                match: { isDeleted: false },
                                populate: {
                                    path: 'elements',
                                    model: 'Element',
                                    match: { isDeleted: false },
                                }
                            }
                        ]
                    }
                }
            }
            ]
        )
    })
}

/**
 * From 2D editor
 */
let duplicate3DSlide = () => {

}

/**
 * Copies a list of slides and their elments
 * @param {*} slides 
 * @param {*} copyPresentation 
 * @param {*} res 
 * @returns 
 */
let copySlidesAndElements = (slides, copyPresentation, res, is3D = false, movementId, templateId) => {
    return slides.map((slide, index) => {
        return copySlideAndElements(slide, copyPresentation, res)
    })
}

let copySlideAndElements = (slide, copyPresentation, res, is3D = false, movementId, templateId) => {
    if (!slide || slide === null || typeof slide === 'string') return;

    let originalId = slide?._id;

    !is3D && (slide = slide.toObject());
    delete slide._id
    delete slide.presentation
    delete slide.creationDate
    delete slide.comments
    delete slide.movementId
    delete slide.template
    delete slide.templateSlide

    // we clean the elements from their previous _id and affect new ones to them
    slide.elements = slide.elements.map((element) => {
        // solution to avoid _id problems, reference errors etc, we create an entirely new document
        delete element._id
        return new Element({
            ...element,
        })
    })

    // we insert these new elements directly from here instead of from where we'll be inserting the slides 
    // since we would need to map through the slides again there, and it wouldn't be necessary since we can use this loop now
    // NB: but could cause a problem if there is an error in insertion we wouldn't notice it here
    let newSlide = new Slide({
        ...slide,
        presentation: copyPresentation._id,
        movement: movementId,

        // added later (not really really needed for this particular slide but good to have)
        template: templateId || copyPresentation.theme,
        templateSlide: templateId || copyPresentation.theme
    });

    slide.elements.length && insertElements(slide.elements).then((elements, error) => {
        if (error)
            res.status(500);
    });

    return newSlide;
}

/**
 * add presentation from body (postman).
 * @param {*} req 
 * @param {*} res 
 */
let addPresentationFromBody = (req, res) => {
    let populate = [ModelRepresentation.slide(true)];
    const { presentation } = req.body;
    // TODO: add condition where the presentation type is template, we let it go through directly
    if (presentation !== null && presentation !== undefined && !presentation.isDeleted /*&& (!presentation.private || presentation.invitations.indexOf(req.userId) !== -1)*/) {


        var copyPresentation = new Presentation({
            name: presentation.name,
            user: req.userId,
            creationDate: Date.now(),
            lastSavedTime: Date.now(),
            type: presentation.type,
            owners: [req.userId],
            workspace: presentation.workspace,
            theme: undefined,
        })

        if (copyPresentation.type !== 'presentation3D' && copyPresentation.type !== 'template3D') {
            // we go through the slides and clean them from their previous ids, presentationInd etc
            copyPresentation.slides = copySlidesAndElements(presentation.slides, copyPresentation, res);
            copyPresentation.slides.length && insertSlides(copyPresentation.slides, copyPresentation._id, res);
        }
        else { // case 3D pres or template, we will get the slides from the movments
            copyPresentation.slides = [];
            populate = [...populate, ModelRepresentation.scenes()];
        }

        // we go through the scenes array and their children elements if they exist
        copyPresentation.scenes = presentation.scenes.map((scene, index) => {
            if (!scene || typeof scene === 'string' || index >= 1) return;

            scene = scene.toObject()
            delete scene._id
            delete scene.creationDate
            // we clean the elements from their previous _id and affect new ones to them
            scene.elements = scene.elements.map((element) => {
                // solution to avoid _id problems, reference errors etc, we create an entirely new document
                delete element._id;
                delete element.creationDate;

                movements = element._3DProperties.movements.map((movement) => {
                    delete movement._id;
                    delete movement.creationDate;

                    let movementId = mongoose.Types.ObjectId();
                    if (movement.slide) {
                        movement.slide = copySlideAndElements(movement.slide, copyPresentation, res, true, movementId);
                        copyPresentation.slides = [...copyPresentation.slides, movement.slide]; // we push the same slide in the presentation slides
                        insertSlides([movement.slide], copyPresentation._id, res);
                    }

                    if (movement.actions) {
                        movement.actions = movement.actions.map(action => {
                            if (!action || action === null || typeof action === 'string') return;

                            // action = action.toObject();
                            delete action._id;
                            delete action.creationDate;

                            action = new Action({
                                ...action
                            });

                            return action;
                        })

                        movement.actions && movement.actions.length && Action.collection.insertMany(movement.actions);
                    }

                    let movementsave = new Movement({
                        _id: movementId,
                        ...movement
                    });

                    movementsave.save();
                    return movementsave;
                });

                //movements && movements.length && Movement.collection.insertMany(movements);
                element._3DProperties.movements = movements;
                element = new Element({
                    ...element,
                });

                if (element?._3DProperties?.type == 'camera') {
                    copyPresentation.cameraId = element._id;
                }

                return element;
            })
            // we insert these new elements directly from here instead of from where we'll be inserting the slides
            // since we would need to map through the slides again there, and it wouldn't be necessary since we can use this loop now
            // NB: but could cause a problem if there is an error in insertion we wouldn't notice it here

            scene.elements.length && insertElements(scene.elements).then((elements, error) => {
                if (error && res)
                    res.status(500)
            })

            let newScene = new Scene({
                ...scene
            });

            newScene.save();
            return newScene;
        })

        copyPresentation.save().then(presentation => {
            res && res.send(presentation)
        }).catch(error => {
            res && res.status(500)
        })
    }
}

/**
 * was put here for the AIAssistantV2.
 * Searches for one image from a query
 */
let pexelsSearchForAssistant = (query, limit = 1, page = 1) => {
    return axios.get(`https://api.pexels.com/v1/search?query=${query}&page=${page}&per_page=${limit}`, {
        headers: {
            Authorization: `${process.env.KEY_PEXELS}`
        }
    })
}


module.exports = {
    createPresentation: createPresentation,
    createPresentationByUser: createPresentationByUser,
    getPresentationByNumber: getPresentationByNumber,
    deletePresentation: deletePresentation,
    setPresentationTitle: setPresentationTitle,
    copyPresentation: copyPresentation,
    getPresentationById: getPresentationById,
    setPresentationLive: setPresentationLive,
    addPresentationOwner: addPresentationOwner,
    deletePresentationOwner: deletePresentationOwner,
    reorderPresentationSlides: reorderPresentationSlides,
    duplicatePresentationSlides: duplicatePresentationSlides,
    copyTemplate: copyTemplate,
    addPresentationFromBody: addPresentationFromBody,
    copyPresentationFolder: copyPresentationFolder,
    setPresentationPrivacy: setPresentationPrivacy,
    applyAllLayoutSlides: applyAllLayoutSlides,
    pexelsSearchForAssistant: pexelsSearchForAssistant,
    getPresentationByIdOwner: getPresentationByIdOwner
}