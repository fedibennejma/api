const User = require("./models/User");
const Presentation = require("./models/Presentation");
const Invitation = require("./models/Invitation");
const PresentationController = require("./controllers/PresentationController");

let slideGlobal = []; // temporary solution to have this in local memory of the server
let intervalIds = []; // used to store all the interval ids so that we can clear the appropriate one when the presenter leaves
let viewsGlobal = []; // used to store the live views
let commentsGlobal = []; // used to store comments on live presentations

const users = {};

const socketToRoom = {};

// common events
exports.load_livePresentation_events = (client) => {
    client.on('subscribeToPresentation', (slug) => {
            client.join(slug);

            // we send the presentation info for all the users (presenter and viewer) on entry
            client.emit('presentationInfo', client.presentationInfo);

            if (client.user.presenter && client.presentation !== undefined && client.presentation !== null) {
                client.emit('presentation', client.presentation)
            }

            if (!client.user.presenter && client.presentationInfo !== undefined)
                client.emit('presentationInfo', client.presentationInfo)
            else if (!client.user.presenter)
                client.emit('waitForPresenter')

            // handle views
            if (viewsGlobal[slug] === undefined || isNaN(viewsGlobal[slug]))
                viewsGlobal[slug] = 0;

            let views = viewsGlobal[slug];
            viewsGlobal[slug] = views + 1;
            client.to(slug).broadcast.emit('views', viewsGlobal[slug]);
            client.emit('views', viewsGlobal[slug]);

            if (commentsGlobal[slug] === undefined) {
                commentsGlobal[slug] = [];
            }

            // init elements for new connection
            client.emit('elements', slideGlobal[slug]);
            client.emit('getComments', commentsGlobal[slug]);

            if (client.user.presenter) {
                presenterEvents(client, slug);
            }

            /* client.on('emitVideoWebcam', (video) => {
                let videoData = {
                id: client.user?.id,
                video,
                user: client.user?.userName
            }
    
            client.emit('videoStream', videoData);
            client.to(slug).broadcast.emit('videoStream', videoData)
            })*/

        client.on('emitComment', (commentValue) => {
            let comment = {
                value: commentValue,
                userName: client.user.userName,
                profilePicture: client.user.profilePicture,
                presenter: false,
            }
            if (client.user.presenter)
                comment.presenter = true;
            commentsGlobal[slug].push(comment);
            client.emit('newComment', comment);
            client.to(slug).broadcast.emit('newComment', comment);
        })

        client.on("join call", roomID => {
            if (users[slug]) {
                const length = users[slug].length;
                if (length === 4) {
                    client.emit("room full");
                    return;
                }
                users[slug].push(client.user.id);
            } else {
                users[slug] = [client.user.id];
            }
            socketToRoom[client.user.id] = slug;
            const usersInThisRoom = users[slug].filter(id => id !== client.user.id);
            client.emit("all users", usersInThisRoom);
        });
    
        client.on("sending signal", payload => {
            client.to(slug).emit('user joined', { signal: payload.signal, callerID: payload.callerID, userToSignal : payload.userToSignal });
        });
    
        client.on("returning signal", payload => {
            client.to(slug).emit('receiving returned signal', { signal: payload.signal, id: client.user.id, callerID : payload.callerID});
        });
    
        client.on('disconnect', () => {
            const slug = socketToRoom[client.user.id];
            let room = users[slug];
            if (room) {
                room = room.filter(id => id !== client.user.id);
                users[slug] = room;
            }
            viewsGlobal[slug] = viewsGlobal[slug] - 1;
            client.to(slug).broadcast.emit('views', viewsGlobal[slug])
        });
    });
}

// events that a presenter can do
function presenterEvents(client, slug) {
    client.on('updateElements', (slide) => {
        client.to(slug).broadcast.emit('elements', slide);
        slideGlobal[slug] = slide;
    })

    client.on('startTimer', () => {
        if (intervalIds[slug]) // we make sure that the timer interval doesn't already exist and avoid interfering timers
            clearInterval(intervalIds[slug]);

        intervalIds[slug] = undefined

        let time = 0;
        interval = setInterval(() => {
            client.emit('timer', secondsToHms(time)) // for the presenter to see
            client.to(slug).broadcast.emit('timer', secondsToHms(time)); // for the users
            time++;
        }, 1000);
        intervalIds[slug] = interval;

        // to notify the users, we set the isLive in presentation to true
        PresentationController.setPresentationLive(client.presentation.id, true).then((presentationUpdated, err) => {
            if (err)
                console.log(err)
            if (presentationUpdated)
                console.log('PRESENTATION', presentationUpdated.live) // should be removed and add a notification to the users
        })
    });

    client.on('emitCursor', (position) => {
        client.emit('cursor', position) // for the presenter to view his cursor also (could be removed when needed)
        client.to(slug).broadcast.emit('cursor', position);
    })

    client.on('cancelCursor', () => {
        client.to(slug).broadcast.emit('cursorCanceled');
    })

    // 

    client.on('stopVideoWebcam', () => {
        client.to(slug).broadcast.emit('toggleVideo', false)
    })

    client.on('startVideoWebcam', () => {
        client.to(slug).broadcast.emit('toggleVideo', true)
    })

    client.on('presenterDisconnect', () => { // when the presenter disconnects we stop the timer
        clearInterval(intervalIds[slug]);
        delete intervalIds[slug];
        delete slideGlobal[slug];
        delete viewsGlobal[slug];
        delete commentsGlobal[slug];
        if (client.presentation)
            PresentationController.setPresentationLive(client.presentation.id, false).then((updated, err) => {
                if (err)
                    console.log(err)
                if (updated)
                    console.log('updated', updated._id, updated.live)
            })
    });
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? (h < 10 ? "0" : "") + h + ":" : "";
    var mDisplay = m > 0 ? (m < 10 ? "0" : "") + m + ":" : "00:";
    var sDisplay = s > 0 ? (s < 10 ? "0" : "") + s : "00";
    return hDisplay + mDisplay + sDisplay;
}

/** Functions should be in a controller */
exports.getUserInfo = (userId) => {
    return User.findById(userId, 'fistName userName profilePicture', (err, user) => {
        if (err)
            res.send(err)
        return user
    })
}

exports.checkUserInvitationLive = (userId, id) => {
    return Invitation.find({
        user: userId,
        presentation: id,
        isDeleted: false
    })
}

// OLD: instead of checking the presentation.user with our userId we directly find the presentation that we need and if we get a result then that user is the owner (slugs must be unique)
// once we check that the user is the owner we directly populate the presntation instead of aking another http call
// the bad thing here is that the presentation will be stored in the server memory
// NEW: we have to get the presentation and check the user later, because we need the presentationId
exports.checkPresentationOwner = (slug) => {
    return Presentation.findOne({
            slug: slug
        }) // newly added comment: we don't check by the userId directly here because we still need the presentation data for the viewer who is not an owner
        .populate({
            path: 'user',
            model: 'User',
            select: '_id userName profilePicture'
        }) // we need the user info for the display of the first screen
        .populate({
            path: 'slides',
            match: {
                isDeleted: false
            },
            populate: [{
                    path: 'elements',
                    model: 'Element',
                    match: {
                        isDeleted: false
                    }
                },
                {
                    path: 'captions',
                    model: 'Caption',
                }
            ],
        })
}