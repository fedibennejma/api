const commentController = require('../controllers/CommentController')

let roomColors = []; // temporary solution to have this in local memory of the server
let usersInRoom = []; // temporary
let selections = []; // temporary

exports.load_collaboration_logic = (client) => {
    client.on('subscribeToCollab', () => {
        let slug = client.slug
        client.join(slug);
        client.user = {
            ...client.user,
            color: getColor()
        }
        client.emit('usersInRoom', usersInRoom[slug] || []);
        setTimeout(() => client.emit('initialSelections', selections[slug] || []), 1000);

        usersInRoom[slug] = joinRoomData(usersInRoom, client.user, slug)

        client.to(slug).broadcast.emit('connectedToEditor', client.user);

        client.on('slideChanged', (slide) => {
            client.to(slug).broadcast.emit('slideChanged', client.user, slide);
        });

        client.on('elementSelected', (elementId, slideId) => {
            client.to(slug).broadcast.emit('elementSelected', client.user, elementId, slideId);
        });

        client.on('elementDeselected', (elementId, slideId) => {
            removeSeletion(client.user, slug)
            client.to(slug).broadcast.emit('elementDeselected', client.user, elementId, slideId);
        });

        client.on('elementChanged', (element, slideId) => {
            addSelection(client.user, element, slideId, slug)
            client.to(slug).broadcast.emit('elementChanged', client.user, element, slideId);
        });

        client.on('elementRemoved', (element, slideId) => {
            client.to(slug).broadcast.emit('elementRemoved', client.user, element, slideId);
            // add remove comment

            removeSeletion(client.user, slug)
        });

        client.on('elementCommented', (comment) => {
            commentController.addComment(client.user.id, comment)
            client.emit('elementCommented', client.user, comment);
            client.to(slug).broadcast.emit('elementCommented', client.user, comment);
        });

        client.on('commentDeleted', (comment) => {
            if (comment.user && (comment.user.id === client.user.id || comment.user._id === client.user.id)) { // check if user is owner first
                commentController.deleteComment(comment._id)
                client.emit('commentDeleted', comment);
                client.to(slug).broadcast.emit('commentDeleted', comment);
            }
        });

        client.on('commentResolved', (comment) => {
            commentController.resolveComment(comment._id)
            client.emit('commentDeleted', comment);
            client.to(slug).broadcast.emit('commentDeleted', comment);
        });

        client.on('slideAdded', (slide) => {
            client.to(slug).broadcast.emit('slideAdded', slide);
        });

        client.on('slideDeleted', (slideId) => {
            client.to(slug).broadcast.emit('slideDeleted', slideId);
        });

        client.on('slideBackground', (slideId, background) => {
            client.to(slug).broadcast.emit('slideBackground', slideId, background);
        });

        client.on('slideSVG', (slideId, svg) => {
            client.to(slug).broadcast.emit('slideSVG', slideId, svg);
        })

        // fired automatically, we don't need to trigger it in the client
        client.on('disconnect', () => {
            removeSeletion(client.user, slug)
            client.to(slug).broadcast.emit('disconnected', client.user)
            usersInRoom[slug] = leaveRoomData(usersInRoom, client.user, slug)
        });
    })
}

getColor = (slug) => {
    // case the array is empty (at first connection or if all the colors were used)
    if (roomColors[slug] === undefined || !roomColors[slug].length)
        roomColors[slug] = ['#a769ff', '#527ee1', '#f5678d', '#ee9ca7', '#ffd200']

    let colors = roomColors[slug]
    let selectedColor = colors.shift()
    roomColors[slug] = colors
    return selectedColor
}

/**
 * When a user joins the room we add him in the usersInRoom array specific to the room.
 * We need it for new connections to find the people already present. Later when the user enters, the newly added users are
 * added in the front
 */
joinRoomData = (usersInRoom, newUser, slug) => {
    if (usersInRoom[slug] !== undefined) {
        let users = usersInRoom[slug]
        users = users.filter((user) => (user.id !== newUser.id));
        return [...users, newUser]
    }
    return [newUser]
}

/**
 * Only needed for the new connections to see people who are actually in the room
 */
leaveRoomData = (usersInRoom, newUser, slug) => {
    if (usersInRoom[slug] !== undefined && usersInRoom[slug].length) {
        return usersInRoom[slug].filter((user) => (user.id !== newUser.id))
    }
    return []
}

/**
 * Jsut for the initial data for those who attend the room later
 */
addSelection = (user, element, slideId, slug) => {
    if (!selections[slug])
        selections[slug] = []

    let foundSelection = false;
    selections[slug] =  selections[slug].map(selection => {
        if (selection && selection.user && selection.user.id === user.id) {
            selection = {user: user, element, slideId};
            foundSelection = true;
        }
        return selection;
    })

    !foundSelection && ( selections[slug] = [...selections[slug], {user: user, element, slideId}] )
}

/**
 * Jsut for the initial data for those who attend the room later
 */
removeSeletion = (user, slug) => {
    if (selections[slug] && selections[slug].length)
        selections[slug] = selections[slug].filter(selection => {
            if (selection && selection.user && selection.user.id !== user.id) {
                return selection;
            }
        })
}