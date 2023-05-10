var express = require('express');
var router = express.Router();
var Presentation = require('../models/Presentation');
var Folder = require('../models/Folder');
var ObjectId = require('mongodb').ObjectID;
var User = require('../models/User');
const authJwt = require('../middlewares/authJwt');
const Workspace = require('../models/Workspace');

router.post('/', [authJwt.verifyToken], function (req, res) {
    const { workspaceId } = req.body;
    var folder = new Folder({
        name: req.body.name || 'Untitled Folder',
        user: req.userId,
        workspace: ObjectId(workspaceId)
    })
    folder.save(function (err) {
        if (err) {
            res.send(err);
        }
        else {
            affectFolderToWorkspace(folder, workspaceId);
            res.send(folder);
        }
    })
});

affectFolderToWorkspace = (folder, workspaceId) => {
    Workspace.findOneAndUpdate({ _id: ObjectId(workspaceId) }, { $addToSet: { folders: folder } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => { });
}

router.get('/', [authJwt.verifyToken], function (req, res) {
    Folder.find({ user: req.userId }, function (err, folders) {
        res.send(folders)
    }).populate([{
        path: 'presentations',
        match: { isDeleted: false },
        populate: [
            {
                path: 'user',
                model: 'User',
            },
            {
                path: 'slides',
                model: 'Slide',
                match: { isDeleted: false }
            }
        ],
    }, {
        path: 'collaborators',
        model: 'User',
        select: '_id userName firstName profilePicture login'
    }])
})

/**
 * Not sure if used anymore. Have to check
 */
router.get('/:slug', [authJwt.verifyToken], function (req, res) {
    Folder.find({ slug: req.params.slug, user: req.userId }, function (err, folder) {
        res.send(folder)
    }).populate({
        path: 'presentations',
        match: { isDeleted: false },
        populate: [
            {
                path: 'user',
                model: 'User',
            },
            {
                path: 'slides',
                model: 'Slide',
                match: { isDeleted: false }
            }
        ],
    })
})

router.put('/:id', [authJwt.verifyToken], function (req, res) {
    // added user to the search instead of doing another condition to check if the user is the owner of the folder
    Folder.findOneAndUpdate({ _id: ObjectId(req.params.id), user: req.userId }, { name: req.body.name }, { new: true }, function (err, result) {
        if (err) {
            res.status(500).send(err);
        }
        else {
            if(result) {
                res.send(result)
            } else {
                res.status(500).send('not authorized');
            }            
        }
    })
})

/**
 * Affects a presentation to a folder
 * NB: should add case where a presentation is removed from here
 */
router.put('/:id/presentation/:presentationId', [authJwt.verifyToken], function (req, res) {
    Presentation.find({ _id: ObjectId(req.params.presentationId), user: req.userId, isDeleted: false }, (err, presentation) => {
        if (err)
            res.send(err)
        else if (presentation !== null) {
            Folder.findOneAndUpdate({ _id: ObjectId(req.params.id), user: req.userId, /*isDeleted: false*/ }, { $addToSet: { presentations: presentation } }, { new: true }, function (err, result) {
                if (err)
                    res.send(err)
                else {
                    if(result) {
                        res.send(result)
                    } else {
                        res.status(500).send('not authorized');
                    }
                }
            }).populate({
                path: 'presentations',
                populate: [
                    {
                        path: 'user',
                        model: 'User',
                    },
                    {
                        path: 'slides',
                        model: 'Slide',
                        match: { isDeleted: false }
                    }
                ],
            })
        }
    });
})

router.delete('/:id/presentation/:presentationId', [authJwt.verifyToken], function (req, res) {
    Presentation.findOne({ _id: ObjectId(req.params.presentationId), user: req.userId }, (err, presentation) => {
        if (err)
            res.send(err)
        else if (presentation !== null) {
            Folder.findOne({ _id: ObjectId(req.params.id), user: req.userId }, function (err, folder) {
                if (err)
                    res.send(err)
                else {
                    folder.presentations.pull(presentation._id)
                    folder.save((err) => {
                        if (err)
                            res.status(500)
                        else
                            res.send(folder)
                    })
                }
            }).populate({
                path: 'presentations',
                populate: [
                    {
                        path: 'user',
                        model: 'User',
                    },
                    {
                        path: 'slides',
                        model: 'Slide',
                        match: { isDeleted: false }
                    }
                ],
            })
        }
    });
})



affectFolderToCollaborator = (_id, collaborators) => {
    collaborators.map((collaborator) => {
        User.findOneAndUpdate({ _id: ObjectId(collaborator) }, { $addToSet: { sharedFolders: ObjectId(_id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => { });
    })
}

/**
 * Affects users to a folder
 */
router.post('/affect-collaborators', [authJwt.verifyToken], function (req, res) {
    const { _id, collaborators } = req.body;
    affectFolderToCollaborator(_id, collaborators)
    Folder.findOneAndUpdate({ _id: ObjectId(req.body._id) },
        { $addToSet: { collaborators: collaborators } },
        { new: true },
        function (err, result) {
            if (err)
                res.send(err)
            else
                res.send(result)
        }).populate([{
            path: 'presentations',
            match: { isDeleted: false },
            populate: [
                {
                    path: 'user',
                    model: 'User',
                    select: '_id userName firstName profilePicture login'
                },
                {
                    path: 'slides',
                    model: 'Slide',
                    match: { isDeleted: false }
                }
            ],
        }, {
            path: 'collaborators',
            model: 'User',
            select: '_id userName firstName profilePicture login'
        }])
})

/**
 * fetch shared folders
 */
router.post('/shared-folders', [authJwt.verifyToken], function (req, res) {
    User.findOne({ _id: req.userId }, function (err, user) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal error please try again');
        } else if (!user) {
            res.status(401).send('User not found');
        } else {
            const sharedFolders = user.sharedFolders;
            if (sharedFolders) {
                res.send(sharedFolders);
            } else {
                res.send([]);
            }
        }
    }).populate({
        path: 'sharedFolders',
        match: { isDeleted: false },
        populate: [{
            path: 'presentations',
            match: { isDeleted: false },
            populate: [
                {
                    path: 'user',
                    model: 'User',
                    select: '_id userName firstName profilePicture login'
                },
                {
                    path: 'slides',
                    model: 'Slide',
                    match: { isDeleted: false }
                }
            ],
        }, {
            path: 'collaborators',
            model: 'User',
            select: '_id userName firstName profilePicture login'
        },
        {
            path: 'workspace',
            model: 'Workspace',
            populate: {
                path: 'team',
                model: 'Team',
            }
        }],
    });
});

/**
 * Get folder presentations of workspace by given ID and folder ID
 */
 router.get('/:workspaceId/:slug', [authJwt.verifyToken], function (req, res) {
    Folder.findOne({slug : req.params.slug, workspace: ObjectId(req.params.workspaceId), isDeleted: false}, function(err,folder) {
        if(err) {
            res.status(500).send('Internal error please try again');
        } else if (!folder) {
            res.status(401).send('Folder not found');
        } else {
            res.send(folder.presentations)
        }
    }).populate({
        path: 'presentations',
        match : {
            isDeleted: false,
            $or : [{ owners: ObjectId(req.userId)},{visitors: ObjectId(req.userId)}]
        },
        populate: [
            {
                path: 'user',
                model: 'User',
                match : {
                    isDeleted: false
                }
            }
        ],
    })
})


module.exports = router;
