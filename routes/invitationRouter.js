var express = require('express');
var router = express.Router();
var Presentation = require('../models/Presentation');
var Invitation = require('../models/Invitation');
var ObjectId = require('mongodb').ObjectID;
const authJwt = require('../middlewares/authJwt');

router.post('/', [authJwt.verifyToken], function (req, res) {
    let invitation = req.body.invitation
    let invitations = []
    if (invitation !== null && invitation !== undefined) {
        let presentationId = invitation.presentation
        // we check if the auth user is the owner of the presentation (we could use a middleware)
        Presentation.findOne({ _id: ObjectId(presentationId), user: req.userId }, (err, presentation) => {
            if (err)
                res.send(err)
            else if (presentation !== null) {
                if (invitation.users && invitation.users.length) {
                    invitation.users.map((user) => {
                        let invitationObject = new Invitation({
                            user: user,
                            owner: req.userId,
                            presentation: invitation.presentation,
                            description: invitation.description,
                            isPrivate: invitation.isPrivate,
                            timeSchedule: invitation.timeSchedule,
                            userPermissions: invitation.userPermissions,
                            thumbnail: invitation.thumbnail
                        })
                        invitations.push(invitationObject)
                    })
                } else {
                    let invitationObject = new Invitation({
                        owner: req.userId,
                        presentation: invitation.presentation,
                        description: invitation.description,
                        isPrivate: invitation.isPrivate,
                        timeSchedule: invitation.timeSchedule,
                        userPermissions: invitation.userPermissions,
                        thumbnail: invitation.thumbnail
                    })
                    invitations.push(invitationObject)
                }
                Invitation.collection.insertMany(invitations, (err, invitations) => {
                    if (err)
                        res.status(500)
                    else
                        res.send(invitations)
                })
            }
            else {
                res.status(500).send("You are not the owner of this presentation or presentation not found")
            }
        })
    }
});

/**
 * Get all the invitations for a user. We use it mainly to get the scheduled presentations
 */
router.get('/', [authJwt.verifyToken], function (req, res) {
    Invitation.find({ user: req.userId }, function (err, invitations) {
        res.send(invitations)
    }).populate({
        path: 'presentation',
        match: { isDeleted: false },
        select: { 'slides': 0 },
        populate: [
            {
                path: 'user',
                model: 'User'
            }
        ],
    })
})


module.exports = router;
