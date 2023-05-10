var ObjectId = require('mongodb').ObjectID;
var Presentation = require('../models/Presentation');
var Slide = require('../models/Slide');
var Element = require('../models/Element');

const { Configuration, OpenAIApi } = require("openai");
const SlideController = require('./SlideController');
const PresentationController = require('./PresentationController');
const { getTitleElementEmpty, getTitleSlideTitleElement, getSubtitleElementEmpty, getTitleSlideSubtitleElement, getContentElementEmpty, getImageEmpty, getNumerotationElement, getOverviewTitle, circleText, subtitleOverview, titleOverview, getOverviewLines, getCircle } = require('../data/slidesAI');
const User = require('../models/User');
const UserController = require('./UserController');
const configuration = new Configuration({
    apiKey: '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', //process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let generateImage = async (prompt, res) => {
    if (!prompt) res.status(404).send();

    const response = await openai.createImage({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      let image_url = response.data.data[0].url;
      res.send(image_url)
}

/**
 * Either generates a slide or a presentation response from OpenAI
 */
let getModelAnswer = async (isPresentation, subject, temperature, res) => {
    console.log(subject)
    let prompt = `presentation with slides and content about ${subject.trim()}. output in JSON string, has title, subtitle, slides. slide has title, subtitle, content`

    if (!isPresentation) {
        prompt = `slide about ${subject.trim()}. output in JSON string that can be parsed, has title, subtitle, content`
    }

    /*let response = {
        "title": "The Legacy of Rome",
        "subtitle": "The Lasting Impact of the Roman Empire",
        "content": "The Roman Empire was one of the most influential empires in world history. Its legacy can be seen in many aspects of modern life, from language and literature to government and law. The Latin language, which was the official language of the Roman Empire, is still used in many countries today. Roman law has been adopted in many countries, and its influence can be seen in the legal systems of Europe, the United States, and other countries. Roman literature, art, and architecture have also had a lasting impact on the world. The Roman Empire was a major force in shaping the world we live in today."
    }
    let result = {
        data: {
            choices: [
                {
                    text: JSON.stringify(response)
                }
            ]
        }
    }
    return await result*/

   // try {
        return await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: temperature || 0,
            max_tokens: 4000
       })
    /*} catch (error) {
        console.log("ERROR -------------------------------------------------", error)
    }*/
}

exports.generatePresentation = async (req, res) => {
    let subject = req.body.prompt;
    if (!subject) res.status(404).send()

    getModelAnswer(true, subject, req.params.temperature, res).then(response => {
        if (!response?.data?.choices?.length) return res.status(500).send()

        return handleResponseJSON(response.data.choices[0].text, res, req.userId)
    })
    return;
    
    let response = {
        "title": "Rome",
        "subtitle": "The Eternal City",
        "slides": [
            {
                "title": "Introduction",
                "subtitle": "A Brief History",
                "content": "Rome is the capital of Italy and one of the most ancient cities in the world. It was founded in 753 BC and was the center of the Roman Empire, which at its peak included much of Europe, North Africa, and the Middle East. Rome is known for its rich history, culture, and monuments, including the Colosseum, the Pantheon, and the Trevi Fountain."
            },
            {
                "title": "Culture",
                "subtitle": "The Heart of Italy",
                "content": "Rome is a vibrant city with a rich cultural heritage. It is home to some of the world's most famous art and architecture, including the Sistine Chapel, the Spanish Steps, and the Roman Forum. The city is also known for its delicious cuisine, with dishes such as pasta carbonara, pizza, and gelato. Rome is also a popular destination for shopping, with its many boutiques and designer stores."
            },
            {
                "title": "Conclusion",
                "subtitle": "The Eternal City",
                "content": "Rome is a city that has stood the test of time. Its history, culture, and monuments make it one of the most popular tourist destinations in the world. Whether you're looking for art, architecture, food, or shopping, Rome has something for everyone. It truly is the Eternal City."
            }
        ]
    }
    response = JSON.stringify(response)
    return handleResponseJSON(response, res)
}

exports.generateSlide = async (req, res) => {
    let subject = req.body.prompt, 
    presentationId = req.params.presentationId;
    if (!subject || !presentationId) res.status(404).send()

    PresentationController.getPresentationByIdOwner(presentationId, req.userId).then((presentation, err) => {
        if (!presentation) return res.status(404);

        let rank = presentation?.slides?.length || 0;
        
        getModelAnswer(false, subject, req.params.temperature, res).then(response => {
            if (!response || !response?.data?.choices?.length) return res.send(404);

            response = response.data.choices[0].text;

            if (response) {
                try {
                    let slide = JSON.parse(response)

                    return createSingleSlide(slide, presentation, res, rank, req.userId)
                } catch (error) {
                    console.log('error parse')
                    return res.send(500)
                }
            } else 
                return res.send(500)
           // return handleResponseJSON(response.data.choices[0].text, res)
       })
    })

    return

    if (!subject) res.status(404).send()

   let prompt = `slide about ${subject}. output in JSON string, has title, subtitle, content`

    const responses = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: req.params.temperature || 0,
        max_tokens: 4000
      }).then(r => {
        return handleResponseJSON(r.data.choices[0].text, res)
      })
}

let handleResponseJSON = (response, res, userId) => {
    // 6231d03b736e8e0018158676
    if (!response || !userId) return console.log('error');

    let presentation = JSON.parse(response)

        let slides = presentation?.slides || [],
            firstSlide = {
                title: presentation?.title,
                subtitle: presentation?.subtitle,
            };
    
        slides = [firstSlide, ...slides];
        presentation = {
            ...presentation,
            slides: slides
        }
    
        return createPresentationAction(presentation, userId, res)

    try {
        
    } catch (error) {
        return res.send(500)
    }
}

/**
 * Creates a presentation from the AI assistant
 * @param {*} element 
 * @param {*} client 
 * @param {*} params 
 */
let createPresentationAction = async (presentationAI, userId, res) => {
    let presentation = new Presentation({
        name: presentationAI?.title,
        description: presentationAI?.subtitle,
        creationDate: Date.now(),
        lastSavedTime: Date.now(),
        private: false,
        type: 'presentation',
        user: userId,
        owners: [userId],
        isAuthorAI: true,
    })

    await presentation.save((err, presentation) => {
        if (err)
            console.log(err)
        else {
            createSlidesAI(presentationAI?.slides, presentation, res, false, userId)
        }
    })
}

let createElementsAI = (slideAI, isFirst, presentationName, images, index, elementsOverview, isSingleSlide = false, elementsSingleSlide) => {
    let {elements, imageSearch} = createElementsLogic(slideAI, isFirst, presentationName, images, index, elementsOverview, isSingleSlide, elementsSingleSlide);

    if (!isFirst) {
        let slideImgElement = new Element({
            type: 'image',
            tag: imageSearch,
            isDeleted: true,
        });

        elements.push(slideImgElement);
        PresentationController.pexelsSearchForAssistant(imageSearch, 4).then((response) => {
            let src = getImgUnique(response, 0, images);

            slideImgElement.layout = getImageEmpty(src + '?fit=crop&h=1080&w=600');
            slideImgElement.isDeleted = false

            images.push(src);
            // should be updated
            slideImgElement.save();
        })
    }

    return elements;
}

/**
 * Slide version of createElementsAI
 */
createElementsAISingleSlide = async (slideAI, isFirst, presentationName, images, index, elementsOverview, isSingleSlide = false, elementsSingleSlide) => {
    let {elements, imageSearch} = createElementsLogic(slideAI, isFirst, presentationName, images, index, elementsOverview, isSingleSlide, elementsSingleSlide);

    return new Promise((resolve) => {
        PresentationController.pexelsSearchForAssistant(imageSearch, 4).then((response) => {
            let src = getImgUnique(response, 0, images);

            let layout = getImageEmpty(src + '?fit=crop&h=1080&w=600');

            images.push(src);
            
            resolve({
                elements: elements,
                tag: imageSearch,
                layout: layout
            })
        })
    })
}

/**
 * Child of createElementsAI and single slide
 */
createElementsLogic = (slideAI, isFirst, presentationName, images, index, elementsOverview, isSingleSlide = false, elementsSingleSlide) => {
    let elements = [], imageSearch = presentationName, // concat title and subtitle so that we can search it in PEXELS or DALL-E
    title = '', subtitle = '';

    for (const type in slideAI) {
        if (slideAI.hasOwnProperty(type)) {
            let elementAI = slideAI[type];

            var element = new Element({
                type: 'text',
                tag: type
            });

            switch (type) {
                case 'title':
                    element.layout = isFirst ? getTitleSlideTitleElement(elementAI) : getTitleElementEmpty(elementAI);
                    imageSearch += ' ' + elementAI; 

                    title = elementAI
                    break;
                case 'subtitle':
                    element.layout = isFirst ? getTitleSlideSubtitleElement(elementAI) : getSubtitleElementEmpty(elementAI);
                    
                    /*if (!elementAI || elementAI === '')
                        imageSearch += ' ' + presentationName;
                    else*/
                        imageSearch += ' ' + elementAI; 
                        subtitle = elementAI

                    break;
                case 'content':
                    if (Object.prototype.toString.call(elementAI) === '[object Array]' && elementAI?.length) {
                        elementAI = concatMultipleContent(elementAI)
                    }
                        element.layout = getContentElementEmpty(elementAI)
                    break
            }

            elements.push(element);
        }
    }

    if (!isFirst) {
        let numerotationElement = new Element({
            type: 'text',
            tag: 'numerotation'
        });

        numerotationElement.layout = getNumerotationElement(index);
        elements.push(numerotationElement);

        // for overview should add condition to generateslide
        createOverviewTitles(title, subtitle, index - 1, elementsOverview);
    }

    return {elements, imageSearch};
}

concatMultipleContent = (contentArray) => {
    let result = '';
    for (let content of contentArray) {
        result += '\n' + content
    }

    return result
}

let getImgUnique = (response, index, images) => {
    let src = response.data?.photos[index]?.src?.original;

    if (images.indexOf(src) !== -1 && index + 1 <= response.data?.photos?.length - 1) {
        src = getImgUnique(response, index + 1, images)
    }

    return src
}

let createSlidesAI = (slidesAI, presentation, res, isFromGenerateSlide, userId) => {
    if (!slidesAI?.length) return;

    let index = isFromGenerateSlide ? 1 : 0, slides = [], elementsToPush = [], // index is 0 by default unless we call from index
    images = []; // reference to all added images so that one doesn't get repeated
    let elementsOverview = []; // the Element titles / subtitles for the overview that we get from the same loop
    for (let slideAI of slidesAI) {
        if (!slideAI) continue;

        let elements = createElementsAI(slideAI, index === 0, presentation?.name, images, index, elementsOverview);
        
        var slide = new Slide({
            rank: index,
            elements: elements?.length ? [...elements] : [],
            background: {
                "color": {
                    "value": index === 0 ? "#2e2d2d" : "#ffffff"
                },
                type: 'color'
            },
            presentation: ObjectId(presentation?._id),
        });

        index++;
        elements?.length && (elementsToPush = [...elementsToPush, ...elements])
        slides.push(slide)
        presentation.slides.push(slide);
    }

    // filtering for the images so that we can save them separately
    elementsToPush = elementsToPush.filter(element => {
        if (!element?.isDeleted)
            return element
    })

    // added for the overview
    let overviewSlide = createOverviewSlide(presentation, elementsOverview);

    if (slides?.length) {
        presentation.slides.splice(1, 0, overviewSlide);
        slides.push(overviewSlide)
    } 

    // added for the overview
    elementsToPush?.length && (elementsToPush = [...elementsToPush, ...elementsOverview])

    elementsToPush?.length && Element.collection.insertMany(elementsToPush);
    slides?.length && Slide.collection.insertMany(slides, (err, slidesInserted) => {
        if (err)
            return res.send(err)
        else {
            presentation.save();
            UserController.decreaseCredits({userId, credits: 50})
            if (isFromGenerateSlide) {
                return res.send(slides)
            } else
                return res.send(presentation)
        }
    })
}

let createSingleSlide = (slideAI, presentation, res, rank, userId) => {
    if (!slideAI) return res.sendStatus(404);

    let elementsToPush = [], // index is 0 by default unless we call from index
    images = []; // reference to all added images so that one doesn't get repeated

    createElementsAISingleSlide(slideAI, false, presentation?.name, images, rank ? rank + 1 - 2 : 1, [], true).then((response) => {
        let elements = response?.elements;

        if (!elements?.length) return res.status(404).send()

        let slideImgElement = new Element({
            type: 'image',
            tag: response?.tag,
            layout: response?.layout
        });

        elements.push(slideImgElement);

        var slide = new Slide({
            rank: 100,
            elements: elements?.length ? [...elements] : [],
            background: {
                "color": {
                    "value": "#ffffff"
                },
                type: 'color'
            },
            presentation: ObjectId(presentation?._id),
        });
    
        if (elements?.length) {
            Element.collection.insertMany(elements);
        }

        Presentation.findOneAndUpdate(
            { _id: presentation?._id },
            { $push: { slides: slide } },
            (error, success) => {
                if (error)
                    res.status(500).send(err)
                else {
                    slide.save((err, newSlide) => {
                        if (!err && newSlide) {
                            UserController.decreaseCredits({userId, credits: 25})

                            return res.send(slide)
                        }
                        return res.status(500)
                    })
                }
        });
    });
}

let createOverviewSlide = (presentation, elements = []) => {
    let titleElement = new Element({
        type: 'text',
        tag: 'title',
        layout: getOverviewTitle()
    });

    let line = new Element({
        type: 'line_dotted',
        layout: getOverviewLines()
    })

    elements.push(titleElement);
    elements.push(line);

    var slide = new Slide({
        rank: 2,
        background: {
            "color": {
                "value": "#2e2d2d",
            },
            type: 'color'
        },
        elements: elements || [],
        presentation: ObjectId(presentation?._id),
    });

    return slide;
}

let createOverviewTitles = (title = '', subtitle = '', index, elementsOverview) => {
    
    let circle = new Element({
        type: 'circle',
        layout: getCircle(index)
    })

    let number = new Element({
        type: 'text',
        layout: circleText(index)
    })

    let subtitleOverviewElt = new Element({
        type: 'text',
        layout: subtitleOverview(index, subtitle)
    })

    let titleOverviewElt = new Element({
        type: 'text',
        layout: titleOverview(index, title.toUpperCase())
    })

    elementsOverview.push(titleOverviewElt);
    elementsOverview.push(subtitleOverviewElt);
    elementsOverview.push(number);
    elementsOverview.push(circle);
}