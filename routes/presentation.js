var express = require('express');
var router = express.Router();
var presentationController = require('../controllers/PresentationController');
var chatAssistantController = require('../controllers/ChatAssistantController');
var Presentation = require('../models/Presentation');
var Invitation = require('../models/Invitation');
var ObjectId = require('mongodb').ObjectID;
var User = require('../models/User');
const authJwt = require('../middlewares/authJwt');
const Theme = require('../models/Theme');
const Layout = require('../models/Layout');
var Element = require('../models/Element');
var Slide = require('../models/Slide');
const ModelRepresentation = require('../util/ModelRepresentation');
const { default: axios } = require('axios');
const { cloudinary } = require('../bin/cloudinary');
const Media = require('../models/Media');
const allIcons = require('../data/allIcons.json');
const allStickers = require('../data/allStickers.json');
const all3dIcons = require('../data/all3dIcons.json');
const templates = require('../data/templates.json');
var fs = require('fs');
const Folder = require('../models/Folder');
const multer = require('multer')

router.post('/', [authJwt.verifyToken], (req, res) => {
    presentationController.createPresentation(req, res).then((presentation, error) => {
        if (error) {
            res.status(500).send('error in create')
        } else if (presentation !== null) {
            res.send(presentation)
        }
    })
});
router.post('/create', [authJwt.verifyToken], presentationController.createPresentationByUser);
router.post('/copy/:id', [authJwt.verifyToken], presentationController.copyPresentation);
router.post('/copy-template', [authJwt.verifyToken], presentationController.copyTemplate)
router.put('/delete/:id', [authJwt.verifyToken], (req, res) => {
    let presentationId = req.params.id;
    let userId = req.userId;
    presentationController.deletePresentation(userId, presentationId).then((presentation, error) => {
        if (error)
            res.status(500).send('error in delete')
        else if (presentation !== null)
            res.send(200)
    })
})
router.post('/order/:id', [authJwt.verifyToken], presentationController.reorderPresentationSlides)

router.put('/title/:id', [authJwt.verifyToken], (req, res) => {
    let presentationId = req.params.id;
    let userId = req.userId;
    let title = req.body.title
    presentationController.setPresentationTitle(userId, presentationId, title).then((presentation, error) => {
        if (error)
            res.status(500)
        else if (presentation !== null) {
            res.send(presentation.slug)
        }
    })
})

router.put('/private/:id', [authJwt.verifyToken], (req, res) => {
    let presentationId = req.params.id;
    let userId = req.userId;
    let value = req.body.value
    presentationController.setPresentationPrivacy(userId, presentationId, value).then((presentation, error) => {
        console.log('here')
        if (error)
            res.status(500)
        else {
            res.send(200)
        }
    })
})

/**
 * RQ: Gets the non-deleted presentations
 */
router.get('/', [authJwt.verifyToken], function (req, res) {
    Presentation.find({ user: req.userId, isDeleted: false }, function (err, presentations) {
        res.send(presentations)
    }).populate("user")
        .populate({
            path: 'slides',
            match: { isDeleted: false }
        });
})

router.get('/seedDeleted', function (req, res) {
    Presentation.updateMany({}, { $set: { isDeleted: false } },
        function (error, success) {
            if (error)
                console.log(error);
            else
                console.log(success);
        });
})

router.get('/all', [authJwt.verifyToken, authJwt.isAdmin], function (req, res) {
    Presentation.find({}, function (err, presentations) {
        res.send(presentations)
    })
        .populate("user")
        .populate({
            path: 'slides',
            match: { isDeleted: false }
        });
})

router.get('/messages', chatAssistantController.getAllMessages)

/**
 * Get presentations of workspace by given ID
 */
router.get('/workspace/:id', [authJwt.verifyToken], function (req, res) {
    Presentation.find({ isDeleted: false, workspace: ObjectId(req.params.id), '$or': [{ owners: ObjectId(req.userId) }, { visitors: ObjectId(req.userId) }] }, function (err, presentations) {
        res.send(presentations)
    }).populate("user")
        .populate({
            path: 'slides',
            match: { isDeleted: false }
        });
})

/**
 * Get presentations of workspace by given ID (pagination)
 */
router.get('/workspace/:id/:skip/:limit', [authJwt.verifyToken], function (req, res) {
    var skip = parseInt(req.params.skip) || 0; //for next page pass 1 here
    var limit = parseInt(req.params.limit) || 5;
    var query = { isDeleted: false, workspace: ObjectId(req.params.id), '$or': [{ owners: ObjectId(req.userId) }, { visitors: ObjectId(req.userId) }] }
    Presentation.find(query).skip(skip).limit(limit).sort({ creationDate : 'Desc'}).select('_id owners creationDate private name slides slug type user workspace thumbnail').populate([
        ModelRepresentation.user(),
        ModelRepresentation.oneSlide()
    ]).exec((err, presentations) => {
        if (err) {
            res.status(500).send(err)
        } else {
            Presentation.countDocuments(query).exec((count_error, count) => {
                if (err) {
                    res.status(500).send(count_error)
                } else {
                    res.send({
                        totalPresentations: count,
                        presentationsLength: presentations.length,
                        restPresentations: count - (skip + limit),
                        presentations: presentations
                    });
                }
            })
        }
    });
})

/**
 * Search presentations of workspace by given ID (pagination)
 */
router.post('/search', [authJwt.verifyToken], function (req, res) {
    var skip = parseInt(req.body.skip) || 0; //for next page pass 1 here
    var limit = parseInt(req.body.limit) || 5;
    let searchInput = req.body.searchInput.toLowerCase();
    var query = { name: { $regex: '.*' + searchInput + '.*', $options: 'i' }, isDeleted: false, workspace: ObjectId(req.body.workspaceId), '$or': [{ owners: ObjectId(req.userId) }, { visitors: ObjectId(req.userId) }] };
    Presentation.find(query).skip(skip).limit(limit).select('_id owners creationDate private name slides slug type user workspace thumbnail').populate([
        ModelRepresentation.user(),
        ModelRepresentation.oneSlide()
    ]).exec((err, presentations) => {
        if (err) {
            res.status(500).send(err)
        } else {
            Presentation.countDocuments(query).exec((count_error, count) => {
                if (err) {
                    res.status(500).send(count_error)
                } else {
                    res.send({
                        totalPresentations: count,
                        presentationsLength: presentations.length,
                        restPresentations: count - (skip + limit),
                        presentations: presentations
                    });
                }
            })
        }
    });
})

/*
router.get('/:id', function (req, res) {
  Presentation.findById(req.params.id, function (err, presentation) {
    res.send(presentation)
  }).populate("user")
    .populate({
      path: 'slides',
      match: { isDeleted: false },
      populate: {
        path: 'elements',
        model: 'Element',
        match: { isDeleted: false }
      }
    });
})
*/

checkPresentationType = (req, res, presentation, comments) => {
    let populate = ModelRepresentation.slide(!comments) // case 2D presentation
    // req.params.is3D === 'true' instead of just req.params.is3D because it's checking the route params
    if (req.params?.is3D === 'true' && (presentation?.type === 'presentation3D' || presentation?.type === 'template3D')) { // case 3D
        populate = ModelRepresentation.scenes();
    }
    presentation.populate({
        ...populate
    }, (err, presentation) => {
        if (err)
            res.send(err)
        else {
            if (presentation._movements) { // added for the movements in 2D editor
                presentation = {
                    ...presentation?._doc, 
                    movements: presentation._movements
                }
                res.send(presentation)
            } else
                res.send(presentation)
        }
    })
}

router.get('/:is3D/:slug', [authJwt.verifyTokenOrNot], (req, res) => {
    Presentation.findOne({ slug: req.params.slug, isDeleted: false }, function (err, presentation) {
        if (presentation?.type === 'presentation3D' || presentation?.type === 'template3D') {
            Element.findOne({ _id: presentation?.cameraId }, (err, camera) => {
                
                if (camera && camera?._3DProperties?.movements?.length) {
                    presentation._movements = camera?._3DProperties?.movements?.filter(movement => {return !movement?.isDeleted});
                }

                if (presentation && presentation.private && presentation.owners.some(owner => owner.id === req.userId)) {
                    return checkPresentationType(req, res, presentation, true)
                }
                else if (presentation && presentation.private && presentation.visitors.some(visitor => visitor.id === req.userId)) {
                    return checkPresentationType(req, res, presentation, false)
                }
                else if (presentation && !presentation.private) {
                    return checkPresentationType(req, res, presentation, presentation.owners.some(owner => owner.id === req.userId))
                }
                else if (presentation && presentation.private && presentation?.type === 'template3D') {
                    return checkPresentationType(req, res, presentation, false);
                }
                else
                    return res.status(404).send()

            }).populate('_3DProperties.movements');

            return;
        }
        // same code repeated
        if (presentation && presentation.private && presentation.owners.some(owner => owner.id === req.userId)) {
            checkPresentationType(req, res, presentation, true)
        }
        else if (presentation && presentation.private && presentation.visitors.some(visitor => visitor.id === req.userId)) {
            checkPresentationType(req, res, presentation, false)
        }
        else if (presentation && !presentation.private) {
            return checkPresentationType(req, res, presentation, presentation.owners.some(owner => owner.id === req.userId))
        }
        else
            res.status(404).send()
    }).populate([
        ModelRepresentation.user(),
        ModelRepresentation.owners(),
        ModelRepresentation.visitors(),
    ])
})

router.post('/theme/:presentationId', function (req, res) {
    let layout = new Layout({
    })

    let theme = new Theme({
        presentation: req.params.presentationId,
    })
})

/**
 * Updates the owners of a presentation. We add an owner and his rights to a presentation
 */
router.put('/:id/owner', [authJwt.verifyToken], (req, res) => {
    let presentationId = req.params.id;
    let userId = req.userId;
    let owner = req.body.owner;
    presentationController.addPresentationOwner(presentationId, userId, owner, res)
})

/**
 * Updates the owners of a presentation. We delete an owner from a presentation
 */
router.delete('/:id/owner/:ownerId', [authJwt.verifyToken], (req, res) => {
    let presentationId = req.params.id;
    let userId = req.userId;
    let owner = req.params.ownerId;
    owner = ObjectId(owner);
    presentationController.deletePresentationOwner(presentationId, userId, owner, res)
})

/**
 * fetch recent images using pexels api
 * @param page number of page
 */
router.post('/pexels-recent/:page', [authJwt.verifyToken], function (req, res) {
    axios.get(`https://api.pexels.com/v1/curated?page=${req.params.page}&per_page=20`, {
        headers: {
            Authorization: `${process.env.KEY_PEXELS}`
        }
    }).then((response) => {
        console.log(response.headers)
        res.json(response.data);
    }).catch((error) => {
        console.error(error)
        res.status(500).send(error)
    })
})

/**
 * search images using pexels api
 * @param page number of page
 */
router.post('/pexels-search/:query/:page', [authJwt.verifyToken], function (req, res) {
    axios.get(`https://api.pexels.com/v1/search?query=${req.params.query}&page=${req.params.page}&per_page=20`, {
        headers: {
            Authorization: `${process.env.KEY_PEXELS}`
        }
    }).then((response) => {
        res.json(response.data);
    }).catch((error) => {
        res.status(500).send(error)
    })
})

/**
 * upload images from presentation
 */
router.post('/upload-image', [authJwt.verifyToken], async (req, res) => {
    try {
        const fileStr = req.body.imageUrl;
        const dimensions = req.body.dimensions;
        const uploadedResponse = await cloudinary.uploader.
            upload(fileStr, {
                upload_preset: 'tto6fni3',
                quality: "auto",
                width: dimensions && dimensions.width > 1500 ? 1500 : dimensions.width,
                dpr: "auto",
                crop: "scale",
                timeout: 60000,
            });
        const media = new Media({
            url: uploadedResponse.url,
            backup_url: uploadedResponse.url,
            workspace: req.body.workspace ? req.body.workspace : null,
            user: req.userId,
            width: dimensions && dimensions.width,
            height: dimensions && dimensions.height
        });
        media.save((err, newMedia) => {
            if (err) {
                res.status(500).send(err)
            } else {
                res.send(newMedia)
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
})

/**
 * add images to recent images
 */
router.post('/add-image', [authJwt.verifyToken], async (req, res) => {
    try {
        const fileStr = req.body.imageUrl
        const media = new Media({
            url: fileStr,
            backup_url: fileStr,
            api: true,
            user: req.userId,
            creationDate: Date.now()
        });
        media.save((err, newMedia) => {
            if (err) {
                res.status(500).send(err)
            } else {
                res.send(newMedia)
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
})


/**
 * fetch images from presentation
 */
router.post('/fetch-images', [authJwt.verifyToken], async (req, res) => {
    let query = { isDeleted: false };
    if (req.body.workspace) {
        query = { isDeleted: false, workspace: req.body.workspace, api: null, type: 'image' }
    } else {
        query = { isDeleted: false, user: req.userId, workspace: null, api: null, type: 'image' }
    }
    Media.find(query, (err, medias) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(medias)
    }).sort({ creationDate: 'desc' })
})

/**
 * delete images from presentation
 */
router.put('/delete-images', [authJwt.verifyToken], async (req, res) => {
    Media.updateOne(
        { _id: req.body.id },
        { $set: { isDeleted: true } },
        (err, media) => {
            if (err) {
                res.status(500).send(err)
            } else
                res.send(media)
        });
})

/**
 * fetch recent images
 */
router.get('/recent', [authJwt.verifyToken], async (req, res) => {
    Media.find({ isDeleted: false, user: req.userId, api: true, type: 'image' }, (err, medias) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(medias)
    }).sort({ creationDate: 'desc' })
})

/**
 * fetch videos
 */
router.get('/videos', [authJwt.verifyToken], async (req, res) => {
    Media.find({ isDeleted: false, user: req.userId, type: 'video' }, (err, medias) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(medias)
    }).sort({ creationDate: 'desc' })
})

/**
 * add videos by link
 */
router.post('/add-video', [authJwt.verifyToken], async (req, res) => {
    try {
        const fileStr = req.body.imageUrl
        const media = new Media({
            url: fileStr,
            backup_url: fileStr,
            type: 'video',
            user: req.userId,
            creationDate: Date.now()
        });
        media.save((err, newMedia) => {
            if (err) {
                res.status(500).send(err)
            } else {
                res.send(newMedia)
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
})


/**
 * upload video in cloudinary
 */
router.post('/upload-video', multer().single('file'), [authJwt.verifyToken], async (req, res) => {
    try {
        const uploadedResponse = await cloudinary.uploader.upload_stream({ resource_type: "video",timeout:520000 }, function (error, result) {
            // After the upload is completed, this callback gets called
            if (error) {
                console.error("Error in cloudinary.uploader.upload_stream\n", error);
                res.status(500).json({ err: error });
            } else {
                // Send back the working URL for the client to display.
                const media = new Media({
                    url: result.secure_url,
                    backup_url: result.secure_url,
                    type: 'video',
                    user: req.userId,
                    creationDate: Date.now()
                });
                media.save((err, newMedia) => {
                    if (err) {
                        res.status(500).send(err)
                    } else {
                        res.send(newMedia)
                    }
                })
            }
        }).end(req.file.buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
})

/**
 * method to get gradient icons from cloudinary
 */
router.get('/gradientIcons', async (req, res) => {
    cloudinary.api.resources_by_tag("3D", { max_results: 500 },
        function (error, result) { res.send(result); });
})

/**
 * method to fetch icons from json
 */
router.get('/fetch-icons', async (req, res) => {
    if (allIcons) {
        res.send(allIcons)
    } else {
        res.status(500).send('error')
    }
})

/**
 * method to fetch stickers from json
 */
router.get('/fetch-stickers', async (req, res) => {
    if (allStickers) {
        res.send(allStickers)
    } else {
        res.status(500).send('error')
    }
})

/**
 * method to fetch 3D icons from json
 */
router.get('/fetch-3D', async (req, res) => {
    if (all3dIcons) {
        res.send(all3dIcons)
    } else {
        res.status(500).send('error')
    }
})

/**
 * Duplicate slide in a presentation
 */
router.put('/duplicate', [authJwt.verifyToken], presentationController.duplicatePresentationSlides)

/**
 * Applies all layout from template into a presentation
 */
router.put('/apply-layout', [authJwt.verifyToken], presentationController.applyAllLayoutSlides)

/**
 * method to fetch template 2D/3D pagination
 */
router.get('/fetch-templates/:skip/:limit/:type', [authJwt.verifyToken], async (req, res) => {
    var skip = parseInt(req.params.skip) || 0;
    var limit = parseInt(req.params.limit) || 5;
    var query = { type: req.params.type, isDeleted: false };

    let populate = {};
    if (req.params.type === 'template') {
        populate = [
            ModelRepresentation.user(),
            ModelRepresentation.oneSlide()
        ]
    } else {
        populate = [
            ModelRepresentation.user(),
            ModelRepresentation.allSlides()
        ]
    }

    Presentation.find(query).skip(skip).limit(limit).select('_id creationDate name slides slug type user workspace thumbnail').populate([
        ...populate
    ]).exec((err, templates) => {
        if (templates && templates.length > 0) {
            Presentation.countDocuments(query).exec((count_error, count) => {
                if (err) {
                    res.status(500).send(count_error)
                } else {
                    res.send({
                        total: count,
                        elements: templates.length + skip,
                        restElements: count - (skip + limit),
                        skipped: parseInt(req.params.skip),
                        templates: templates
                    });
                }
            })
        } else {
            res.status(500).send('error');
        }
    });
})

/**
 * Convert rgba to hex
 */
rgba2hex = (rgba) => {
    rgba = rgba.match(
        /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
    );

    return rgba && rgba.length === 4
        ? "#" +
        ("0" + parseInt(rgba[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgba[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgba[3], 10).toString(16)).slice(-2)
        : null;
}

/**
 * method to get template colors
 */
router.post('/colors/:id', async (req, res) => {
    Presentation.findById(req.params.id, async (err, presentation) => {
        if (presentation) {
            let colors = [];
            let gradients = [];
            await Promise.all(presentation.slides.map((slide) => {
                if (slide?.background?.gradient?.colorStops && slide?.background?.gradient?.colorStops.length > 0) {
                    const firstColor = slide?.background?.gradient?.colorStops[0].color;
                    const secondColor = slide?.background?.gradient?.colorStops[1].color;
                    const concatColor = firstColor + ',' + secondColor;
                    gradients.push({ firstColor, secondColor, concatColor });
                    colors.push({ hex: rgba2hex(firstColor) }, { hex: rgba2hex(secondColor) })
                }
                if (slide?.background?.color?.value) {
                    if (rgba2hex(slide?.background?.color?.value) !== null) {
                        colors.push({ hex: rgba2hex(slide?.background?.color?.value) });
                    } else {
                        colors.push({ hex: slide?.background?.color?.value });
                    }
                }
                slide.elements.map((element) => {
                    if (element?.layout?.text?.font?.color) {
                        if (rgba2hex(element?.layout?.text?.font?.color) !== null) {
                            colors.push({ hex: rgba2hex(element?.layout?.text?.font?.color) });
                        } else {
                            colors.push({ hex: element?.layout?.text?.font?.color });
                        }
                    }
                    if (element?.layout?.color?.gradient?.colorStops && element?.layout?.color?.gradient?.colorStops.length > 0) {
                        const firstColor = element?.layout?.color?.gradient?.colorStops[0].color;
                        const secondColor = element?.layout?.color?.gradient?.colorStops[1].color;
                        const concatColor = firstColor + ',' + secondColor;
                        gradients.push({ firstColor, secondColor, concatColor });
                        colors.push({ hex: rgba2hex(firstColor) }, { hex: rgba2hex(secondColor) })
                    }
                    if (element?.gradient?.colorStops && element?.gradient?.colorStops.length > 0) {
                        const firstColor = element?.gradient?.colorStops[0].color;
                        const secondColor = element?.gradient?.colorStops[1].color;
                        const concatColor = firstColor + ',' + secondColor;
                        gradients.push({ firstColor, secondColor, concatColor });
                        colors.push({ hex: rgba2hex(firstColor) }, { hex: rgba2hex(secondColor) })
                    }
                });
            }));
            res.send(
                {
                    colors: Array.from(new Set(colors.map(color => color.hex))).map(hex => {
                        return colors.find(color => color.hex === hex)
                    }),
                    gradients: Array.from(new Set(gradients.map(gradient => gradient.concatColor))).map(concatColor => {
                        return gradients.find(gradient => gradient.concatColor === concatColor)
                    })
                });
        } else {
            res.status(500).send(err)
        }
    }).populate(ModelRepresentation.slide())
})

/**
 * method to fetch last updated presentations
 */
 router.get('/recent-presentation', [authJwt.verifyToken], async (req, res) => {
    Presentation.find({ user : req.userId,isDeleted: false}).sort({lastSavedTime: 'desc'}).limit(3).select('_id creationDate name slides slug type user workspace thumbnail').populate([
        ModelRepresentation.user(),
        ModelRepresentation.oneSlide()
    ]).exec((err, presentations) => {
        if(err) {
            res.status(500).send(err)
        } else {
            res.send(presentations);
        }
    });
})

router.post('/add-presentation', [authJwt.verifyToken], presentationController.addPresentationFromBody);
router.post('/copy-presentation-folder', [authJwt.verifyToken], presentationController.copyPresentationFolder);

module.exports = router;
