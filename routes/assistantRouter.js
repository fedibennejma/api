var express = require('express');
var router = express.Router();
const authJwt = require('../middlewares/authJwt');
const assistantController = require('../controllers/AssistantController')
const assistantV2Controller = require('../controllers/AssistantV2Controller')

router.post('/openai', async (req, res) => {
    return assistantV2Controller.generatePresentation(req, res)
    // create a pitch deck presentation for airbnb
    const responses = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: req.body.prompt || "hi",
        temperature: req.params.temperature || 0,
        max_tokens: 4000
      }).then(r => res.send(r.data.choices[0].text));

      // in one word what type of presentation is a presentation about 5G. Is it educational, financial, entertainment, pitch-deck?
      // create a presentation with slides and content about rome. Each slide title should be in [[]]
      // create a presentation with slides and content about steve jobs. Each slide title should be in [[]]. in the voice of someone who is a hater / use a negative tone
      // create a presentation with slides and content about steve jobs. Each slide title should be in [[]]. mention a dog named pixa in one of the slides
      // create a presentation with slides and content about Trantino. Each slide title should be in [[]]. Each slide should have a subtitle between (( and content between " and an image link url between << and >>
      //create a presentation with slides and content about Apple. Slides are separated by //// Each slide title should be in [[]]. Each slide should have a subtitle between (( and content between "
      // three words subject
      return;

      let answer = '';

      // create a presentation about rome with this outline
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: "create a pitch deck presentation outline about airbnb",
        temperature: 0,
        max_tokens: 4000,
      }).then(async (r) => {
        let string = r.data.choices[0].text;
        console.log(string)
        if (string) {
            console.log('here')
            let parts = string.split('.')
            let index = 1;

            iterate(index, parts, answer, res);
        }
      });

    //res.send(response)
})

router.post('/slide/:presentationId', [authJwt.verifyToken, authJwt.hasCreditsSlide], assistantV2Controller.generateSlide)
router.post('/presentation', [authJwt.verifyToken, authJwt.hasCredits], assistantV2Controller.generatePresentation)

const iterate = async (index, parts, answer, res) => {
    if (index <= 6) {
        console.log(index, "create a slide with titles and content for the pitch deck of slidzo about" + parts[index])
        const newResponse = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: "create a slide for the pitch deck of airbnb about" + parts[index],
            temperature: 0,
            max_tokens: 4000,
          }).then(r => {
            answer+= '*******************************************\n ' + r.data.choices[0].text;
            index++;
            iterate(index, parts, answer, res)
          });
    } else {
        res.send(answer)
    }
}

router.post('/', assistantController.sendInput); 
router.get('/init', assistantController.initTrainingData); // should be middleware of admin
router.post('/start', [authJwt.verifyToken], assistantController.startConversation);

module.exports = router;