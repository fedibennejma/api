const assistantController = require("./AssistantController"); // may cause circular dependency
const assistantCasesController = require("./AssistantCasesController"); // contains all the functions for the conditional cases in the "next" tags
const chatController = require("./ChatAssistantController");
const presentationController = require("./PresentationController");
const slideController = require("./SlideController");
var assistantAnswers = require('../assistantAnswers.json'); // training data containing assistantAnswers and treated with key values as tags so that the answers can be accessed fast (it shouldn't be a problem for < 50 000)
var Element = require('../models/Element');

/**
 * Emits socket response to user.
 * @param {*} client 
 * @param {*} response : string response to be shown to user
 * @param {*} waitingTime : the value of the waiting time (default to 2500) but can be set to 0 if we don't want waiting periods
 */
let emitSocketResponse = (client, response, waitingTime = 2500) => {
    if (client !== undefined) {
        client.emit('wait', true) // triggers the writing dot in the frontend
        setTimeout(() => { 
            client.emit('response', { value: response }); 
            client.emit('wait', false)
        }, waitingTime)
    }
}

/**
 * Used alongside emitSocketResponse.
 * Emits the presentation data stored in the client
 * @param {*} client 
 * @param {*} presentatation 
 * @param {*} waitingTime 
 */
let emitPresentation = (client, presentation, waitingTime = 2500) => {
    if (client !== undefined && presentation !== undefined) {
        client.emit('wait', true) // triggers the writing dot in the fronten
        setTimeout(() => { 
            client.emit('presentationChange', presentation); 
            client.emit('wait', false)
        }, waitingTime)
    }
}

let setBgColor = (element, client, params, lastUnusedResponse) => {
    console.log("params ", params)
    if (lastUnusedResponse !== undefined)
        console.log(lastUnusedResponse)
}

/**
 * 
 * @param {object} element
 * @param {object} client: client for socket
 * Checks if user already gave info about how he is during in this conversation (by going through the intents stored in messages)
 * Depending on the result, the assistant gives the next response
 */
let handle_ask_about_assistant = (element, client) => {
    let next_tag = '' 
    chatController.checkIntentAsked(client.user._id, element.tag, 30).then((result) => {
        console.log('result.length', result.length)
        if (result !== undefined && result !== null && result.length < 5 && result.length >= 1) // case question already asked and it means that the assistant already asked about the user also
            next_tag = assistantAnswers[element.next[1].tag] // case the assistant already asked
        else if (result !== undefined && result !== null && result.length > 5) // case question already asked way more times than normal
            next_tag = assistantAnswers[element.next[2].tag] // case the assistant gets annoyed
        else // case question not asked, ask about user (go to next node)
            next_tag = assistantAnswers[element.next[0].tag] // case the assistant needs to ask about user

        if (next_tag !== undefined && next_tag !== null) {
            let response = assistantController.handleClassifiedData(next_tag.tag, [], client) // doesn't classify, only gets the responses and entities
            client.emit('wait', true) // triggers the writing dot in the frontend
            setTimeout(() => { client.emit('response', { value: response }); client.emit('wait', false) }, 2500)
        }
    })
}

/**
 * Helper function to go to the next specified tag
 * @param {*} client 
 * @param {*} next_tag specified tag that will be called
 */
let handleGoNext = (client, next_tag) => {
    if (next_tag !== undefined && next_tag !== null) {
        let response = assistantController.handleClassifiedData(next_tag.tag, [], client) // doesn't classify, only gets the responses and entities
        client.emit('wait', true) // triggers the writing dot in the frontend
        setTimeout(() => {client.emit('response', {value: response}); client.emit('wait', false)}, 2500)
    }
}

/**
 * Goes to the next tag by default directly before the user's answer
 * (not used a lot)
 * @param {object} element
 * @param {object} client: client for socket
 * 
 */
let go_next_default = (element, client) => {
    let next_tag = assistantAnswers[element.next[0].tag] // only next_tag available is the first one
    handleGoNext(client, next_tag)
}

/**
 * Goes to the next tag on a condition. The condition is specified in the data.json in "case" in the "next" objects. The case name is the function name
 * stored in assistantCasesController that returns the boolean result of the condition. 
 * So we need to loop through all the next tags of the intent to find the one with the appropriate case
 * @param {*} element 
 * @param {*} client 
 * @param {*} params 
 */
let go_next_intent = (element, client, params) => {
    if (element !== null && element !== undefined && element.next !== undefined && element.next.length) {
        for (let nextElement of element.next) {
            assistantCasesController[nextElement.case](element, client, params) && handleGoNext(client, assistantAnswers[nextElement.tag])
        }
    }
}

/**
 * Repeats differently the same previous intent answer from the assistant
 * @param {*} element not used 
 * @param {*} client
 */
let repeatAction = (element, client) => {
    chatController.getLastAssistantMesage(client.user._id).then((result) => {
        if (result !== undefined && result !== null && result.intent !== undefined) {
            let response = assistantController.handleClassifiedData(result.intent, [], client)
            client.emit('wait', true) // triggers the writing dot in the frontend
            setTimeout(() => {client.emit('response', {value: response}); client.emit('wait', false)}, 2500)
        }
    })
}

/**
 * Gets the status of the assistant. Should return the last action called by the assistant
 * @param {*} element 
 * @param {*} client 
 */
let statusAction = (element, client) =>  {
    chatController.getLastAssistantMesage(client.user._id).then((result) => {})
}

/**
 * Creates a presentation and selects it (by calling setSelectedPresentation from assistantController)
 * @param {*} element 
 * @param {*} client 
 * @param {*} params 
 */
let createPresentationAction = (element, client, params) => {
    let name = '';
    for (let param of params) {
        if (param !== undefined && param.value !== undefined && param.entity === 'subject') {
            name+= ' ' + param.value
        }
    }
    let input = {
        body: {
            userId: client.user !== undefined && client.user._id,
            isAuthorAI: true,
            name: name !== '' ? name : 'Untitled Presentation'
        }
    }

    let presentation = presentationController.createPresentation(input)
    if (presentation !== null && presentation !== undefined)
        assistantController.setSelectedPresentation(client, presentation)
}

let addSlide = (element, client, params) => {
    if (client.presentationId !== undefined && client.user !== undefined) {
        let nb = 1
        if (params !== undefined && params.length) (nb = parseInt(params[0].value)) // the params here have the number of slides to be added
        slides = slideController.generateNbSlides(nb)
        slideController.createMultipleSlides(slides, client.presentationId, client.user._id).then((presentation, err) => {
            if (err) {
                let response = assistantController.handleClassifiedData('error_assistant', [], client)
                emitSocketResponse(client, response, 0)
            } else // !!!
                assistantController.setSelectedPresentation(client, presentation) // only to add the new slides to the client.slides and synch the data
        })
    } else {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    }
}

/**
 * Selects a presentation depending on the params values and types: number, text etc
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let selectPresentation = (elements, client, params) => {
    if (!params.length) {
        let response = assistantController.handleClassifiedData('no_presentation_selected_params', [], client)
        emitSocketResponse(client, response, 0)
    } else
        for (let param of params) {
            if (param !== undefined)
                switch (param.entity) {
                    case 'number':
                        presentationController.getPresentationByNumber(client.user._id, param.value).then((presentation, err) => {
                            if (presentation !== null && presentation !== undefined && presentation._id !== undefined) {
                                client = assistantController.setSelectedPresentation(client, presentation)
                                emitSocketResponse(client, 'Presentation: ($' + presentation.name + '$) selected', 0)
                                // maybe add emit inside setSelectedPresentation
                                emitPresentation(client, {id: client.presentationId, slides: client.slides, selectedSlide: client.slideId}, 0)
                            }
                        })
                        break;
                    case 'subject':
                        // should be added also
                        break;
                }
        }
}

/**
 * Selects a slide depending on the params values: number
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let selectSlide = (elements, client, params) => {
    if (client.presentationId === undefined) {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    } else if (!params.length) {
        let response = assistantController.handleClassifiedData('no_slide_selected_params', [], client)
        emitSocketResponse(client, response, 0)
    } else
        for (let param of params) {
            if (param !== undefined)
                switch (param.entity) {
                    case 'number': // should be already only filtered to number. Test without it and maybe remove it to lower complexity?
                        if (client.slides !== undefined && client.slides !== null && client.slides.length) { // can be not synchornized with the real data

                            // same bit of code we used for the presentation in its controller. Maybe move this to a helper funciton used by both
                            let number = param.value // is a string
                            let skipValue = Math.max(0, parseInt(number) - 1) // since the users generally don't know that counting in arrays starts with 0 we remove 1 + we avoid having a negative skip value
                            // case where the skipVlue is a string (because its  parseInt(number) is NaN) means that it probably contains a 'last' or 'first' command
                            if (Number.isNaN(skipValue))
                                skipValue = number.includes('last') ? client.slides.length - 1 : number.includes('first') ? 0 : number;

                            let selectedSlide = client.slides[skipValue]
                            if (selectedSlide !== undefined && selectedSlide !== null) {
                                client = assistantController.setSelectedSlide(client, selectedSlide._id)
                                emitSocketResponse(client, 'Slide: ($' +( skipValue + 1 ) + '$) selected', 0)
                                emitPresentation(client, {id: client.presentationId, slides: client.slides, selectedSlide: client.slideId}, 0)
                            } else {
                                emitSocketResponse(client, "Slide ($" +( skipValue + 1 ) + "$) doesn't exist in this presentation", 0)
                            }
                        } else {
                            // get the nth slide from Mongo, only as a backup but shouldn't be necessary 
                        }
                        break;
                    // add case about the subject of the slide?
                }
        }
}

/**
 * Selects an element depending on the params values: number, type of element etc. 
 * Maybe should be devided into multiple clearer functions?
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let selectElement = (elements, client, params) => {
    console.log('selectElement')
    if (client.presentationId === undefined) {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    } else if (client.slideId === undefined) {
        let response = assistantController.handleClassifiedData('no_slide_selected', [], client)
        emitSocketResponse(client, response, 0)
    } else if (!params.length) {
        let response = assistantController.handleClassifiedData('no_element_selected_params', [], client)
        emitSocketResponse(client, response, 0)
    } else {
        let selectedSlide;
        let selectedElement;
        let elements = [];
        // selects our slide object so that we can get its elements
        for (let slide of client.slides) {
            if (slide._id === client.slideId) {
                selectedSlide = slide
                break;
            }
        }
        if (selectedSlide !== undefined) {
            for (let param of params) {
                if (param !== undefined) {
                    switch (param.entity) {
                        case 'number': // should be already only filtered to number. Test without it and maybe remove it to lower complexity?
                            if (client.slides !== undefined && client.slides !== null && client.slides.length) { // can be not synchornized with the real data
                                // same bit of code we used for the presentation in its controller. Maybe move this to a helper funciton used by both
                                let number = param.value // is a string
                                let skipValue = Math.max(0, parseInt(number) - 1) // since the users generally don't know that counting in arrays starts with 0 we remove 1 + we avoid having a negative skip value
                                // case where the skipVlue is a string (because its  parseInt(number) is NaN) means that it probably contains a 'last' or 'first' command
                                elements = (selectedSlide.elements !== undefined) ? selectedSlide.elements : []
                                if (Number.isNaN(skipValue))
                                    skipValue = number.includes('last') ? elements.length - 1 : number.includes('first') ? 0 : number;
    
                                selectedElement = elements[skipValue]
                                console.log('skipValue', skipValue, selectedElement)
                            }
                            break;
                        case 'element_type_title':
                            elements = selectedSlide.elements.length
                            selectedElement = elements.filter((element) => {
                                if (element.tag === 'title')
                                    return element
                            })
                            break;
                        case 'element_type_subtitle':
                            elements = selectedSlide.elements
                            for (let element of elements) {
                                if (element.tag === 'subtitle') {
                                    selectedElement = element
                                    break;
                                }
                            }
                            break;
                        case 'element_type_content':
                            elements = selectedSlide.elements.length
                            selectedElement = elements.filter((element) => {
                                if (element.tag === 'content')
                                    return element
                            })
                            break;
                        // add case about the subject of the slide?
                    }
                }
            }
        }

        if (selectedElement !== undefined && selectedElement !== null) {
            client = assistantController.setSelectedElement(client, selectedElement)
            emitSocketResponse(client, 'Element selected', 0)
            emitPresentation(client, { id: client.presentationId, slides: client.slides, selectedSlide: client.slideId, selectedElement: selectedElement }, 0)
        } else {
            emitSocketResponse(client, "The element doesn't exist in this presentation", 0)
        }
    }
}
/**
 * Sets client action to delete
 * @param {*} elements 
 * @param {*} client 
 */
let handleDelete = (elements, client, params) => {
    client.action = 'deleteSelectedElement'
    // not really related to delete action. Used to select and delete at the same time
    if (params !== undefined && params.length) {
        selectPresentation(elements, client, params) // should be changed to selectElement to make it general
        cancelActions(elements, client) // we use this instead of if else, when assigning the client.action 
        //because we still need client.action to have a value when the action is called for security
    }
}

let handleSetPresentationTitle = (elements, client, params) => {
    client.action = 'setPresentationTitle'
    // case where the user already specifies the presentation title and we don't need to ask him again about the title
    if (params !== undefined && params.length) {
        setPresentationTitle(elements, client, params[0].value)
        cancelActions(elements, client) // we use this instead of if else, when assigning the client.action 
        //because we still need client.action to have a value when the action is called for security
    }
}

/**
 * Handles the subtitle text. Either the user specifies the text content, then 
 * we set the subtitle text directly, or, we set the client.action and wait for the next input
 * to trigger the setSubtitleText 
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let handleSetSubtitle = (elements, client, params) => {
    client.action = 'setSubtitleText'
    if (params !== undefined && params.length) {
        setSubtitleText(elements, client, params[0].value)
        cancelActions(elements, client) // we use this instead of if else, when assigning the client.action 
        //because we still need client.action to have a value when the action is called for security
    }
}

/**
 * Handles the content text. Either the user specifies the text content, then 
 * we set the subtitle text directly, or, we set the client.action and wait for the next input
 * to trigger the setContentText 
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let handleSetContent = (elements, client, params) => {
    client.action = 'setContentText'
    if (params !== undefined && params.length) {
        setContentText(elements, client, params[0].value)
        cancelActions(elements, client) // we use this instead of if else, when assigning the client.action 
        //because we still need client.action to have a value when the action is called for security
    }
}

/**
 * Deletes a selected element depending on client.selectedItem type
 * @param {*} elements 
 * @param {*} client 
 */
let deleteSelectedElement = (elements, client) => {
    if (client.selectedItem === 'PRESENTATION' && client.presentationId !== undefined && client.user !== undefined) {
        presentationController.deletePresentation(client.user._id, client.presentationId).then((presentation, error) => {
            if (error)
                emitSocketResponse(client, 'error while deleting this presentation')
            else if (presentation !== null)
                client = assistantController.unselectPresentation(client)
            else
                emitSocketResponse(client, 'error deleting presentation. It may not exist or you may not be the presentation owner')
        })
    } else if (client.selectedItem === 'SLIDE' && client.slideId !== undefined && client.user !== undefined) {
        // delete slide
    } else if (client.selectedItem === 'ELEMENT' && client.elementId !== undefined && client.user !== undefined) {
        // delete element
    } else {
        emitSocketResponse(client, "element already deleted or doesn't exist")
    }
}

/**
 * Handling the actions that are triggered by the confirmation. These actions are stored in the client.action
 * @param {*} elements 
 * @param {*} client 
 */
let handleYesActions = (elements, client) => {
    if (client.action !== undefined) {
        module.exports[client.action](elements, client)
        cancelActions(elements, client)
    }
}

/**
 * Deletes the client actions
 * @param {*} elements 
 * @param {*} client 
 */
let cancelActions = (elements, client) => {
    delete client.action
}

/**
 * Chooses the appropriate action to fire depending on what has been previously stored to client.action.
 * Called in AssistantController in handleClassifiedDataContainer if the client has an action stored.
 * We need it when calling actions not directly with a node but after a next node
 * @param {*} elements 
 * @param {*} client 
 */
let handleActionFiring = (elements, client, input) => {
    console.log('handle action ', client.action)
    module.exports[client.action](elements, client, input)
    cancelActions(elements, client)
}

let setPresentationTitle = (elements, client, input) => {
    if (client.action === 'setPresentationTitle' && client.presentationId !== undefined && client.user !== undefined) // double check but shouldn't be needed
        presentationController.setPresentationTitle(client.user._id, client.presentationId, input).then((presentation, error) => {
            if (error)
                emitSocketResponse(client, 'error setting title to this presentation. Please retry', 0)
            else if (presentation !== null) {
                emitSocketResponse(client, 'your new presentation title is officially: ($' + presentation.name + '$)', 0)
                createTextElement('title', client, presentation.name, presentation._id, presentation.slides[0]._id) // temporary call for the assistant to this. It's like a placeholder for the title
                // until the user specifies the real title
            }
        })
    else
        emitSocketResponse(client, 'no presentation selected or no user logged in. Please retry', 0)
}

let setTitleTextColor = (elements, client, params) => {
    
}

/**
 * Sets the title text by calling createTextElement with the right info (text content etc)
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let setTitleText = (elements, client, params) => {
    let title = '';
    for (let param of params) {
        if (param !== undefined && param.value !== undefined && param.entity === 'text') {
            title+= ' ' + param.value
        }
    }

    if (client.presentationId !== undefined && client.user !== undefined)
        createTextElement('title', client, title, client.presentationId)
    else {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    }
}

let setTitleColor = (elements, client, params) => {
    let color = '';
    for (let param of params) {
        if (param !== undefined && param.value !== undefined && param.entity === 'color') {
            color+= ' ' + param.value
        }
    }

    if (client.presentationId !== undefined && client.user !== undefined) {
        if (client.selectedElement !== undefined) {
            let title = client.selectedElement
            title.layout.text.font = {
                ...title.layout.text.font,
                color: color
            }
            slideController.insertElements([title], client.presentationId)
        } else {
            let response = assistantController.handleClassifiedData('no_element_selected', [], client)
            emitSocketResponse(client, response, 0)
        }
    } else {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    }
}

/**
 * Creates an Element Model for the title, using its passed params.
 * 
 * Separated from createTitleElement for more visibility and better use in other functions.
 * @param {String} text content of the text
 * @param {String} color
 * @param {String} tag the tag value of the text: title, subtitle, content
 */
let getTextElement = (text, color, tag) => {
    // values are hard-coded here, should be changed
    return new Element({
        rank: 0,
        type: 'text',
        layout: {
            position: { // position should be specified
                left: 218.5,
                top: 226.7,
                angle: 0,
            },
            text: {
                content: text,
                placeholder: 'Click to Edit Titles',
                font: {
                    color: color,
                }
                // font should be added with next intent
            },
            size: null
        },
        isDeleted: false,
        tag: tag
    })
}

/**
 * Finds and returns the first element with an elementTag (expl: 'title', 'content')
 * @param {*} slide full slide object we pass. Should be selected in the client
 * @param {*} elementTag (expl: 'title', 'content')
 */
let getElementTagInSlide = (slide, elementTag) => {
    if (slide !== undefined && slide.elements) {
        for (let element of slide.elements) {
            if (element !== undefined && element !== null) {
                if (element.tag === elementTag) return element
            }
        }
    }
    return null
}

/**
 * Container for the element updater in the db in slideController.
 * This function was created to contain the asynchronous callback of the update function in the db
 * @param {*} element 
 * @param {*} responseTag the tag called by handleClassifiedData for the answer (expl: 'text_font_set'). If it's null we don't emit an assistant response dialogue
 */
let updateElement = (client, element, responseTag = null) => {
    console.log('element to update', element)
    return slideController.updateElement(element).then((element, err) => {
        let response = ''
        if (err)
            response = assistantController.handleClassifiedData('error_assistant', [], client)
        else if (element && responseTag !== null)
            response = assistantController.handleClassifiedData(responseTag, [], client)

        assistantController.setSelectedElement(client, element) // to update the selected element with its new values
        emitSocketResponse(client, response, 0)
        emitPresentation(client, {id: client.presentationId, slides: client.slides, selectedSlide: client.slideId, selectedElement: client.selectedElement }, 0)
    })
}

/**
 * Finds a slide by id from slides list (usually in client.slides)
 * @param {*} slides 
 * @param {*} slideId 
 */
let getSelectedSlide = (slides, slideId) => {
    for (let slide of slides) {
        if (slide !== null && slide !== undefined && slide._id === slideId)
            return slide
    }
}

/**
 * Same function as setTitleText with only difference being the type of added element
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let setSubtitleText = (elements, client, input) => {
    let title = '';
    if (input !== undefined) title = input
    if (client.presentationId !== undefined && client.user !== undefined) {
        createTextElement('subtitle', client, title, client.presentationId)
        let entity = {
            entity: 'text',
            value: title
        }
        let response = assistantController.handleClassifiedData('subtitleText_set', [entity], client)
        emitSocketResponse(client, response, 0)
    }
    else {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    }
}

/**
 * Same function as setTitleText with only difference being the type of added element
 * @param {*} elements 
 * @param {*} client 
 * @param {*} params 
 */
let setContentText = (elements, client, input) => {
    let title = '';
    if (input !== undefined) title = input
    if (client.presentationId !== undefined && client.user !== undefined) {
        createTextElement('content', client, title, client.presentationId, undefined, undefined, false)
        let entity = {
            entity: 'text',
            value: title
        }
        let response = assistantController.handleClassifiedData('contentText_set', [entity], client)
        emitSocketResponse(client, response, 0)
        emitPresentation(client, {id: client.presentationId, slides: client.slides, selectedSlide: client.slideId}, 0)
    }
    else {
        let response = assistantController.handleClassifiedData('no_presentation_selected', [], client)
        emitSocketResponse(client, response, 0)
    }
}

/**
 * Creates or updates text element of a slide (depending on type: title, subtitle, content ...)
 *
 * Called individually or inside setTitleText()
 * Generating title element to the specified slide of the presentation or the first one if there isn't any.
 * 
 * Emits the presentation to the front-end client
 * 
 * NB: can have a bug where the slide elements in client aren't properly updated with the user changes outside the assistant => can add another title to the previously added
 * @param {*} text
 * @param {*} presentationId
 * @param {*} color: optional
 * @param {*} update (bool) check if we need to update an already added title. It's true by default, but if we want to add multiple titles to a slide we need to set it to false
 */
let createTextElement = (type, client, text, presentationId, slideId, color, update = true) => {
    // look for update
    let titleElement

    if (client.slides !== undefined && client.slides !== null && client.slides.length) {
        if (slideId === undefined && client.slideId !== undefined) // case where we have a selected slide and we didn't specify an id for this function (should be most of the time)
            slideId = client.slideId
        else if (slideId === undefined) // case we didn't specify slideId and we don't have a selected slide, we take the first slide
            slideId = client.slides[0]._id // should always exist
        // else: we use the normal slideId which is by default

        let slide = getSelectedSlide(client.slides, slideId)
        update && (titleElement = getElementTagInSlide(slide, type))
    } else { // shouldn't be necessary but just in case the slides weren't stored in the client for some reason
        // should be changed to get nth slide
        let slide = slideController.getFirstSlide(presentationId)
        update && (titleElement = getElementTagInSlide(slide, type))
    }

    // if title doesn't already exist, create a new one
    if (titleElement === null || titleElement === undefined) // we don't need to also check update, since we already have that when titleElment is undefined
        titleElement = getTextElement(text, color, type)
    else {
        // update the element
        titleElement.layout.text.content = text
        titleElement.layout.text.font.color = color
    }

    client = assistantController.setSelectedElement(client, titleElement)
    slideController.insertElements([titleElement], presentationId, slideId).then(res => {
        // not great for performance to fetch the presentation on each change! But this was made for simplicity
        // also, risk for the asynchronous function call to cause a bug (very low risk but can happen if the server is slow): we set this presentation as selected after that the user already selects another one
        presentationController.getPresentationById(presentationId).then(presentation => {
            assistantController.setSelectedPresentation(client, presentation) // we use this not to select the presentation in itself but to update our slides and elements in the client
        })
    })
}

let handleTextFont = (elements, client, params) => {
    client.action = 'setTextFont'
    if (params !== undefined && params.length) {
        setTextFont(elements, client, params)
        cancelActions(elements, client) // we use this instead of if else, when assigning the client.action 
        //because we still need client.action to have a value when the action is called for security
    }
}

let setTextFont = (elements, client, params) => {
    console.log('params ', params)
    /*let colors = {
        "red": [""]
    }*/
    if (client.action === 'setTextFont' && client.selectedElement !== undefined && client.user !== undefined) {// double check but shouldn't be needed
        let element = client.selectedElement
        let defaultFont = { // case where the element was just created we use this as it doesn't have a font 
            align: "center",
            color: "rgba(1,0,1,1)",
            family: "Open Sans",
            isItalic: false,
            isUnderlined: false,
            size: 25,
        }
        let font = element.layout.text.font !== undefined ? element.layout.text.font : defaultFont
        for (let param of params) {
            switch (param.entity) {
                case 'px':
                case 'number':
                    let fontSize = parseInt(param.value)
                    font.size = fontSize
                    break;
                case 'text_decoration':
                    // should take into consideration the typos!!
                    switch (param.value) {
                        case 'bold':
                            font.weight = 'SemiBold'
                            break;
                        case 'thin':
                        case 'light':
                            font.weight = ''
                            break;
                        case 'italic':
                            font.isItalic = true
                            break;
                        case 'underlined':
                            font.isUnderlined = true
                            break;
                        case 'normal':
                            font.isUnderlined = false
                            font.isItalic = false
                            font.weight = ''
                            break;
                    }
                    break;
                case 'font':
                    let family = param.value
                    font.family = family
                    break;
                case 'size':
                    break;
                case 'color':
                    font.color = param.value
                    break;
                case 'direction':
                    // we should search in the list the closest strings to the param value
                    // maybe use this npm install string-similarity --save
                    console.log('ALIGN', param.value)
                    font.align = param.value
                    break;
            }
        }
        console.log('font changed', element)
        element !== undefined && updateElement(client, element, 'text_font_set')
    } else if (client.selectedElement === undefined) {
        let response = assistantController.handleClassifiedData('no_element_selected', [], client)
        emitSocketResponse(client, response, 0) 
    } else
        emitSocketResponse(client, 'no presentation selected or no user logged in. Please retry', 0)
}

let centerElement = (elements, client, params) => {
    if (client.presentationId !== undefined && client.selectedElement !== undefined && client.user !== undefined) {
        let element = client.selectedElement
        // we need to know the dimensions of the fabric canvas
        // TODO
        let centerH = false;
        let centerV = false;
        let center;
        for (let param of params) {
            switch (param.entity) {
                case 'center_type_H':
                    centerH = true
                    break;
                case 'center_type_V':
                    centerV = true;
                    break;
            }
        }
        center = (!centerH && !centerV) ? true : centerH && centerV // if both centerH and V are false, it probably means that they weren't specified
        // and the user needs an absolute center. In the other case, we check if both are true, or not. If they're both true, it means that the center is also absolute (for H and V)
        element.layout.centerObject = {
            ...element.layout.centerObject,
            center: center,
            centerH: centerH,
            centerV: centerV
        }

        return updateElement(client, element)
    } else if (client.selectedElement === undefined) {
        let response = assistantController.handleClassifiedData('no_element_selected', [], client)
        emitSocketResponse(client, response, 0) 
    } else
        emitSocketResponse(client, 'no presentation selected. Please select one', 0)
}

module.exports = {
    setBgColor: setBgColor,
    handle_ask_about_assistant: handle_ask_about_assistant,
    go_next_default: go_next_default,
    repeatAction: repeatAction,
    statusAction: statusAction,
    createPresentationAction: createPresentationAction,
    selectPresentation: selectPresentation,
    selectSlide: selectSlide,
    selectElement: selectElement,
    handleDelete: handleDelete,
    deleteSelectedElement: deleteSelectedElement,
    handleYesActions: handleYesActions,
    cancelActions: cancelActions,
    go_next_intent: go_next_intent,
    handleSetPresentationTitle: handleSetPresentationTitle,
    handleActionFiring: handleActionFiring,
    setPresentationTitle: setPresentationTitle,
    addSlide: addSlide,
    setTitleText: setTitleText,
    setTitleColor: setTitleColor,
    setSubtitleText: setSubtitleText,
    handleSetSubtitle: handleSetSubtitle,
    handleSetContent: handleSetContent,
    setContentText: setContentText,
    handleTextFont: handleTextFont,
    setTextFont: setTextFont,
    emitPresentation: emitPresentation,
    centerElement: centerElement
}