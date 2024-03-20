const Ajv = require('ajv');
const ajv = new Ajv();

const jokeSchema = {
    properties: {
        joke: {type: 'string'},
        punchline: {type: 'string'},
        rating: {type: 'integer'}
    },
    required: ['joke', 'punchline', 'rating'],
    additionalProperties: false
    };

    module.export = {
        jokeSchema: jokeSchema
    }