const express = require('express');
const bodyParser = require('body-parser');
const genAI = require('@google/genai');
const app = express()
const qs = require('qs')
const https = require('https');
const fs = require('fs');
const path = require('path');
const port = 4000
const dotenv = require('dotenv').config();
const apiKey = process.env.API_KEY
const ai = new genAI.GoogleGenAI({ apiKey });
const cors = require('cors')

const {
    HarmBlockThreshold,
    HarmCategory,
    Type,
} = require('@google/genai');

const config = {
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  // Block most
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  // Block most
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  // Block most
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  // Block most
        },
    ],
    responseMimeType: 'application/json',
    responseSchema: {
        type: Type.OBJECT,
        required: ["title", "moral", "characters"],
        properties: {
            title: {
                type: Type.STRING,
            },
            moral: {
                type: Type.STRING,
            },
            characters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    required: ["name", "description"],
                    properties: {
                        name: {
                            type: Type.STRING,
                        },
                        description: {
                            type: Type.STRING,
                        },
                    },
                },
            },
            story: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                },
            },
        },
    },
};

const privateKey = fs.readFileSync(path.join(__dirname, 'api.cert.key'));
const certificate = fs.readFileSync(path.join(__dirname, 'api.cert.pem'));

const credentials = {
    key: privateKey,
    cert: certificate
};

// const contents = [
//     {
//         role: 'user',
//         parts: [
//             {
//                 text: `generate me a children's bedtime story. use the following parameters:
//       the theme of the story is about friendship
//       the story takes place in a forest
//       the character species are dragon, robot, butterfly`,
//             },
//         ],
//     },
// ];

app.use(bodyParser.json());
app.use(cors());
app.set('query parser', (str) => qs.parse(str, { comma: true }));

let genCount = 0;
const genLimit = 30;
let genLastCountDate = new Date();

const resetGenCount = () => {
    const now = new Date();
    if (now - genLastCountDate > 24 * 60 * 60 * 1000) {
        genCount = 0;
        genLastCountDate = now;
    }
}

const genResponse = async (prompt) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        config,
        contents: prompt,
    });
    return response.text;
}

app.get('/', (req, res) => {
    res.send('Testing api!')
})

app.post('/generate', async (req, res) => {
    resetGenCount();
    const testPrompt = `generate me a children's bedtime story. use the following parameters:
                        the theme of the story is about ${req.query.theme}
                        the story takes place in ${req.query.location}
                        the character species are ${req.query.species}`

    if (genCount >= genLimit) {
        res.send(`You have reached the limit of ${genLimit} generations per day. Please try again tomorrow.`);
    } else {
        getCount++;
        const prompt = testPrompt;
        // const prompt = req.body.prompt;
        // const response = await genResponse(prompt);
        res.send(testPrompt)
    }
})

app.get('/generate', async (req, res) => {
    resetGenCount();
    const prompt = `generate me a children's bedtime story. use the following parameters:
                        the theme of the story is about ${req.query.theme}
                        the story takes place in ${req.query.location}
                        the character species are ${req.query.species}`

    if (genCount >= genLimit) {
        res.send(`You have reached the limit of ${genLimit} generations per day. Please try again tomorrow.`);
    } else {
        genCount++;
        const response = await genResponse(prompt);
        res.send(response)
    }
})

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(port, () => {
    console.log(`HTTPS server listening on port ${port}`);
});

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
// })