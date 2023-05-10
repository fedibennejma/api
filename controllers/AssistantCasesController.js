// This controller is seperated from assistantActionsController only for more visibility. It contains the functions called by the "case" in the "next" tags of the elements (assistantResponses)
// NB: can be merged back to assistantActionsController

/**
 * Case when the user doesn't specify a title as a param for a presentation. 
 * Also used for other text inputs like subtitle etc
 * @param {*} element 
 * @param {*} client 
 * @param {*} params 
 */
let noTitleSpecified = (element, client, params) => {
    if (params.length === 0)
        return true
    return false
}

/**
 * Case when the user specifies a title text
 * @param {*} element 
 * @param {*} client 
 * @param {*} params 
 */
let titleSpecified = (element, client, params) => {
    if (params.length === 0  && params[0] !== undefined && params[0].value !== undefined && params[0].entity === 'text') // we only need to check on first param
        return true
    return false
}

module.exports = {
    noTitleSpecified: noTitleSpecified,
    titleSpecified: titleSpecified
}