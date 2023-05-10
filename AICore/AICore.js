var brain = require('brain.js');
var natural = require('natural');
var fs = require('fs');
var trainingData = require('./trainingData.json');
const tf = require('@tensorflow/tfjs');
const tfn = require("@tensorflow/tfjs-node");

exports.initAI = () => {
    var net = new brain.NeuralNetwork();

    net.train(
        [{ input: [0, 0], output: [0] },
        { input: [0, 1], output: [1] },
        { input: [1, 0], output: [1] },
        { input: [1, 1], output: [0] }]
    );

    var output = net.run([1, 0]);
    console.log(output);
}

exports.classifyText = async function classifyText() {
    var net = new brain.NeuralNetwork();
    console.log('training');

    const trainingPhrases = [
        { input: "my unit-tests failed.", output: "software" },
        { input: "tried the program, but it was buggy.", output: "software" },
        { input: "i need a new power supply.", output: "hardware" },
        { input: "the drive has a 2TB capacity.", output: "hardware" },
        { input: "unit-tests", output: "software" },
        { input: "program", output: "software" },
        { input: "power supply", output: "hardware" },
        { input: "drive", output: "hardware" }
    ]

    const dictionary = buildWordDictionary(trainingPhrases)
    const trainingSet = trainingPhrases.map(dataSet => {
        const encodedValue = encode(dataSet.input, dictionary)
        return { input: encodedValue, output: dataSet.output }
    })
    console.log(trainingSet);
    net.train(trainingSet);
    const encoded = encode("drive", dictionary);

    console.log("output = ", net.run(encoded));
}

function buildWordDictionary(trainingData) {
    const tokenisedArray = trainingData.map(item => {
        const tokens = item.input.split(' ')
        return tokens.map(token => natural.PorterStemmer.stem(token))
    })

    const flattenedArray = [].concat.apply([], tokenisedArray)
    return flattenedArray.filter((item, pos, self) => self.indexOf(item) == pos)
}

function encode(phrase, dictionary) {
    const phraseTokens = phrase.split(' ')
    const encodedPhrase = dictionary.map(word => phraseTokens.includes(word) ? 1 : 0)

    return encodedPhrase
}

exports.trainClassifier =  async function classifyText2() {
    const net = new brain.recurrent.LSTM();
    console.log('started LSTM')

    const options = {
        iterations: 2000
    }

    let data = [];
    for (let element of trainingData) {
        for (let input of element.input) {
            data.push({
                input: input,
                output: element.output
            })
        }
    }
    console.log(data);
    
    const p1 = net.train(data, options);
    Promise.all([p1])
        .then((values) => {
            const res = values[0];
            console.log(res);
            fs.writeFileSync('trained-net.json', JSON.stringify(net.toJSON()));
        })
}

exports.runClassifier = function runClassifier() {
    const net = new brain.recurrent.LSTM();
    var json = JSON.parse(fs.readFileSync('trained-net.json', 'utf8'));
    net.fromJSON(json)
    console.log('yeah sure ' + net.run('yeah sure'))
    console.log('see you later ' + net.run('see you later'))
    console.log('see you later! ' + net.run('see you later!'))
    console.log('see you latr ' + net.run('see you latr'))
    console.log('this is exactly what I need! ' + net.run('this is exactly what I need!'))
    console.log('give me your second option ' + net.run('give me your second option'))
}

exports.convertKerasModel =  (async () =>  {
    const handler = tfn.io.fileSystem("./model.json");
    const model2 = await tf.loadLayersModel(handler);
    model2.summary();
    // console.log(model2.predict('hello there'))
})