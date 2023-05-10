var ObjectId = require('mongodb').ObjectID;
var mongoose = require('mongoose');
var Movement = require('../models/Presentation3D/Movement');
var Action = require('../models/Presentation3D/Action');
var Presentation = require('../models/Presentation');

exports.addCamera = (req, res) => {
    const camera = new Movement({
        presentation: req.params.presentationId,
        rank: req.body.rank,
        position: req.body.position,
        rotation: req.body.rotation,
        time: req.body.time,
        delay: req.body.delay,
        userControl: req.body.userControl,
    });

    camera.save((err, camera) => {
        if (err)
            res.status(500).send(err)

        Presentation.findOneAndUpdate(
            { _id: req.params.presentationId },
            { $push: { cameras: camera } },
            (error, success) => {
                if (error)
                    res.status(500).send(err)
                else {
                    if (req.body.actions) {
                        this.addActions(req.body.actions, camera._id); // we are doing 2 saves on the same model, I know
                    }
                    res.send(camera);
                }
        });
    })
}

exports.addActions = (actions, movementId) => {
    Action.bulkWrite(
        actions.map((action) => (
            {
                updateOne: {
                    filter: { _id: action._id || mongoose.Types.ObjectId() },
                    update: { $set: action },
                    upsert: true, new: true, setDefaultsOnInsert: true
                },
            }
    ))).then(res => {
        Movement.findOneAndUpdate(
            { _id: movementId },
            { $push: { actions: res.result.upserted } },
            (error, movement) => {})
    })
}