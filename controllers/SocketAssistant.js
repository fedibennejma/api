const assistantController = require("./AssistantController");

exports.load_assistant_logic = (client) => {
    client.on('subscribeToAssistant', () => {
        client.join(client.user._id);
        client.emit('response', 'connection to ' + client.user._id);
        client.on('emitMessage', (message) => {
            assistantController.getAssistantResponse(client.user._id, message, undefined, client).then(response => {
                client.emit('response', {value: response, message})
            })
        })

        client.on('inactivity', () => {
            client.emit('response', {value: assistantController.handleInactivity()})
        })

        client.on('selectedPresentation', (presentation) => {
            assistantController.setSelectedPresentation(client, presentation, true)
        })

        client.on('selectedSlide', (slideId) => {
            assistantController.setSelectedSlide(client, slideId)
        })
    })
}

exports.assistant_send_response = () => {
    
}