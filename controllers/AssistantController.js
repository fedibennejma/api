var Client = require('node-rest-client').Client;
var client = new Client();
var fs = require('fs');
const flask_endpoint = 'http://31918d8adcb5.ngrok.io'; // temporary here
var trainingData = require('../AICore/data.json'); // raw training data same as the one in the python env
var assistantAnswers = require('../assistantAnswers.json'); // training data containing assistantAnswers and treated with key values as tags so that the answers can be accessed fast (it shouldn't be a problem for < 50 000)
const rasa_base_url = "http://localhost:5005/model/parse"; // temp
var Promise = require('promise');
const { resolve } = require('path');
var actions = require('./AssistantActionsController')
var chatAssistantController = require('./ChatAssistantController');
const AssistantActionsController = require('./AssistantActionsController');

/**
 * Old functions using flask endpoints instead of Rasa
 */
exports.sendInput = (req, res) => {
    var args = {
        data: { "sentence": req.body.sentence },
        headers: { "Content-Type": "application/json" }
    };
    client.post(flask_endpoint + "/api/assistant", args, function (data, response) {
        if (data.length)
            res.send(getAnswers(data))
    }).on('error', function (err) {
        console.log('something went wrong on the request');
    });
}

/**
 * Handles the assistant answer following the data.json and assistantAnswers.json intent, responses and entity structures.
 * Checks for missing params and calls the appropriate actions for that intent.
 * Saves the response in a Message model in the db.
 * It's called from handleClassifiedDataContainer when we handle the classified results from Rasa or directly when we feed it an intent tag directly (like noanswer etcc)
 * @param {*} intent user intent we get from Rasa server or add manually like 'greet', 'noanswer' etc
 * @param {*} entities the entities that should be associated with the intent (we generally get the list from the data array)
 * @param {*} client holds the socket client and the userId info etc.. we use it mainly to trigger an assistant answer in the socket or to get the userId when saving a response
 */
exports.handleClassifiedData = (intent, entities, client) => {
    console.log(entities)
    let element = assistantAnswers[intent];
    if (element !== undefined) {
        let assistantResponse = '';
        if (element.params !== undefined && element.params.length) {
            let {missingParams, validEntites} = this.checkMissingParam(entities, element.params)
            if (missingParams.length) {
                assistantResponse = getRandomResponse(assistantAnswers['missing_prarams'].responses) + ' the ' + missingParams.join(' or ') //'I need you to give me details about ' + missingParams.toString() // case when params are mising, we don't getAppropriateAnswer from the assistant
            }
            // calls the appropriate action function from the assistantActionsController
            // NB: problem here when the action is called when the params are defined is that the actions don't get called unless there are some parms
            else if (element.actions !== undefined && element.actions.length) { // also making sure that we don't call this if we don't have all the needed params
                callElementActions(element, client, validEntites)

                assistantResponse = getAppropriateAnswer(element, entities) // case when there are no missing params and the action is fired
            }
        } else {
            // case we need an action without any params/entity
            if (element.actions !== undefined && element.actions.length) { // also making sure that we don't call this if we don't have all the needed params
                callElementActions(element, client)
            }
            assistantResponse = getAppropriateAnswer(element, entities) // case when the intent doesn't need any params or action to return an appropriate assistant response
        }

        let result = this.cleanParamsInResponse(assistantResponse, element.params)
        if (client.user !== undefined && client.user !== null)
            chatAssistantController.addMessage(client.user._id, false, result, intent) // the assistant answer is saved
        return result;
    }
    return getRandomResponse(assistantAnswers['noanswer'].responses)
}

/**
 * Part of handleClassifiedData. Calls the appropriate actions of the element in data.json
 * @param {*} element 
 */
let callElementActions = (element, client, validEntites)  => {
    console.log(element)
    for (let actionName of element.actions) {
        if (actions[actionName] !== undefined)
            actions[actionName](element, client, validEntites)
    }
}

/**
 * Cleans the params that are still present in the answer (most likely non-requiered params).
 * @param {string} response: text containing ($var) to be cleaned
 * @param {list} params: list of params needed by this intent (contained in data)
 */
exports.cleanParamsInResponse = (response, params) => {
    if (params !== undefined && response !== undefined)
        for (let param of params) {
            response = response.replace('($' + param.name + ')', '')
        }

    return response
}

/**
 * Returns the appropriate answer from the element's trained responses and replaces the entity values in the response string
 * @param {*} element 
 * @param {*} entities 
 */
let getAppropriateAnswer = (element, entities) => {
    if (element.responses !== undefined) {
        let assistantResponse = getRandomResponse(element.responses)
        // goes through all the entities detected and check if they exist on the response string to be replaced.
        // the loop can be extra for some cases but the number of detected entities is not big so no performance problem
        for (let entity of entities) {
            (entity !== null && assistantResponse !== undefined) && (assistantResponse = assistantResponse.replace('($' + entity.entity + ')', '($' + entity.value + '$)'))
        }

        return assistantResponse;
    }
}

/**
 * Selects a random value from array and returns a message
 * @param {*} responses 
 */
let getRandomResponse = (responses) => {
    var randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
}

getAnswers = (data) => {
    let answers = [];
    for (element of data) {
        if (element.intent !== undefined)
            answers.push(getAnswer(element.intent))
    }

    return answers;
}

/**
 * Should be an endpoint that is called only by admin when needed (initialising the data in a json file and only updating it once a day or 
 * once the training data changes)
 */
exports.initTrainingData = (req, res) => {
    assistantAnswers = {};
    for (intent of trainingData.intents) {
        assistantAnswers[intent.tag] = intent;
    }
    fs.writeFileSync('assistantAnswers.json', JSON.stringify(assistantAnswers));
    res.send('updated')
}

/**
 * Updated endpoints on Rasa server.
 * Sends the user input to rasa server and gets a clissification on the intent and entities
 */
classifyIntent = async (input) => {
    var args = {
        data: { "text": input },
        headers: { "Content-Type": "application/json" }
    };

    return new Promise((resolve) => {
        client.post(rasa_base_url, args, function (data, response) {
            if (data !== null && data !== undefined)
                resolve(data)
        }).on('error', function (err) {
            resolve(null);
        })
    })
}

/**
 * Handles the logic of the assistant response once we have classified intents
 * @param {*} data data we get from the rasa server
 * @param {*} client 
 * @param {*} input raw input of the user, used as an entity input for some questions
 */
let handleClassifiedDataContainer = (data, client, input) => {
    console.log(data)
    if (client.action !== undefined && data.intent.name !== 'cancel' && data.intent.name !== 'affirm') // case where we have a pending question from the assistant, that the user needs to answer
        AssistantActionsController.handleActionFiring(undefined, client, input)
    else if (data.intent.confidence > 0.3) // temp , needs to be multiple intents (maybe 0.09)
        return this.handleClassifiedData(data.intent.name, data.entities, client);
    return getRandomResponse(assistantAnswers['noanswer'].responses)
}

/**
 * Container for getAssistantResponse (just for the http calls as a fallback)
 */
exports.startConversation = async (req, res) => {
    let input = req.body.sentence;
    let userId = req.userId;
    this.getAssistantResponse(userId, input, res)
}

/**
 * Classifies the user intent and gets the userId (to store the messages for now) and returns the assistant's answer + actions.
 * Called directly from the assistant socket or from the startConversation() as a http call in case of a problem
 * @param {number} userId: id of the user from the token
 * @param {string} input: user intent to be classified and answered
 * @param {object} res(optional): just for the http call
 * @param {object} client(optional): used for socket call from assistantActionsController
 */
exports.getAssistantResponse = async (userId, input, res, client) => {
    return classifyIntent(input).then((result) => {
        // saving the user message. The assistant response message is saved inside the handleClassifiedData()
        chatAssistantController.addMessage(userId, true, input, result) // even if result is undefined or null we save the msg. 
        if (result !== null) {
            let response = handleClassifiedDataContainer(result, client, input)
            if (res !== undefined)
                res.send(response)
            else
                return response
        }
        else {
            if (res !== undefined)
                res.status(500).send('error with rasa server')
            else
                return 'error with rasa server'
        }
    })
}

/**
 * Compares the entities provided from the user input and the params needed for the intent and returns the missing entents/parameters
 * @param {list} entities entites list that we got from user intent 
 * @param {list} params appropriate params for the intent (from data.json)
 */
exports.checkMissingParam = (entities, params) => {
    let missingParams = []
    let validEntites = [] // valid entities provided by the user
    let entityTypes = entities.map((entity) => { return entity.entity });
    for (let param of params) {
        // the performance shouldn't be affected a lot sice the entities and params are always small arrays
        let indexParamInEntities = entityTypes.indexOf(param.name)
        if (indexParamInEntities === -1 && param.required)
            missingParams.push(param.name)
        // this was deprecated for another loop
        /*else if (entities[indexParamInEntities] !== undefined) // entities[indexParamInEntities] !== undefined is to avoid undefined list in the array
            validEntites.push(entities[indexParamInEntities])*/
    }

    // this was added later as a fix for the validEntities that wouldn't include repeated entity types
    let paramNames = params.map((param) => { return param.name });
    for (let entity of entities) {
        // the performance shouldn't be affected a lot sice the entities and params are always small arrays
        let indexEntiyInParam = paramNames.indexOf(entity.entity)
        if (indexEntiyInParam !== -1) {
            validEntites.push(entity)
        }
    }

    return {missingParams, validEntites}
}

exports.askForMissingParam = (entities, params) => {
    let {missingParams, validEntites} = this.checkMissingParam(entities, params)
    if (missingParams.length) {
        return ' Please provide ' + missingParams.toString();
    }
    return ''
}

exports.handleInactivity = () => {
    if (assistantAnswers['inactivity'] !== undefined)
        return getRandomResponse(assistantAnswers['inactivity'].responses)
}

/**
 * Still not used
 */
exports.substractEntities = (input) => { 
    let tokens = input.split('"')
    let entity = ''
    if (tokens.length)
        entity = tokens[1]

    return entity
}

/**
 * 
 * @param {*} client: we use it here to store the info
 */
exports.getSelectedPresentation = (client) => {
    return client.presentationId
}

/**
 * Stores the selected presentation id in the client and changes the selectedItem accordingly (to 'PRESENTATION')
 * @param {*} client: we use it here to store the info
 * @param {*} presentationId the presentationId that we need
 * @param {*} fromEditor true when the editor sends the presentation info => we don't set a selected slide since we set it separately in this case.
 */
exports.setSelectedPresentation = (client, presentation, fromEditor = false) => {
    if (presentation !== null && presentation !== undefined && presentation._id !== undefined) {
        client.presentationId = presentation._id
        client.selectedItem = 'PRESENTATION'
        console.log('presentation selected !! ', presentation._id)
        // newly added. Contains the full slides array of the presentation but the server memory usage should be checked for multiple users:
        // after a simple test it doesn't seem to be a memory shortage even for 80 000 simultanious uses: memory 84MB
        client.slides = presentation.slides || []

        if (!fromEditor && client.slideId === undefined && presentation.slides && presentation.slides.length) {
            this.setSelectedSlide(client, presentation.slides[0]._id)
            AssistantActionsController.emitPresentation(client, {id: presentation._id, slides: presentation.slides || [], selectedSlide: presentation.slides[0]._id}, 0)
        } else 
            AssistantActionsController.emitPresentation(client, {id: presentation._id, slides: presentation.slides || [], selectedSlide: client.slideId}, 0)
    }

    return client
}

/**
 * Maybe replace this by unselect all, for all the selected elements
 * @param {*} client 
 */
exports.unselectPresentation = (client) => {
    if (client !== undefined) {
        delete client.presentationId
        client.selectedItem = ''
    }

    return client
}

/**
 * Stores the selected presentation id in the client and changes the selectedItem accordingly
 * @param {*} client: we use it here to store the info
 * @param {*} slideId: the slideId that we need
 */
exports.setSelectedSlide = (client, slideId) => {
    if (slideId !== null && slideId !== undefined) {
        client.slideId = slideId
        client.selectedItem = 'SLIDE'
        // no need for a full selectedSlide object like we did in setSelectedPresentation
    }
    return client
}

/**
 * Stores the selected element object in the client
 * @param {*} client: we use it here to store the info
 * @param {*} elementId: the elementId that we need
 */
exports.setSelectedElement = (client, element) => {
    if (element !== null && element !== undefined) {
        client.selectedElement = element
        client.selectedItem = 'ELEMENT'
    }
    return client
}