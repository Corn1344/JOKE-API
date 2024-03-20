const app = require('express')();
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { Spanner } = require('@google-cloud/spanner');
const { createLogger, transports, format } = require('winston');
const { error } = require('ajv/dist/vocabularies/applicator/dependencies');

// Create a logger instance
const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console(),
    ],
});

app.disable('x-powered-by');
app.use(bodyParser.json());
// Create a Spanner client
const spanner = new Spanner({
    projectId: 'arctic-badge-415108'
});

// Define your Spanner instance and database information
const instanceId = 'jokes-api'; // Updated instance ID
const databaseId = 'joke-db'; // Updated database ID

// Get a reference to your Spanner database
const database = spanner.instance(instanceId).database(databaseId);

// Define your table name
const tableName = 'jokes';

const port = process.env.PORT || 8080;

app.use(bodyParser.json());

app.listen(
    port
);

app.get('/jokes', async (req, res) => {
    try {
        logger.info('Received request to view jokes', { requestBody: req.body });
        const [rows] = await database.run({
            sql: `SELECT * FROM ${tableName}`,
        });
        res.status(200).send({ data: rows });
    } catch (err) {
        logger.error('Error when retrieving jokes', { requestBody: err })
        res.status(500).send({ error: 'An error occurred while retrieving jokes' });
    }
});

app.get('/jokes/:id', async (req, res) => {
    const id = uuidv4();
    if (req.params.id.length !== id.length) {
        res.status(400).send({ message: 'Not a valid ID' })
    } else {
        try {
            logger.info(`Received request to view joke with id: ${req.params.id}`, { requestBody: req.body });
            const [rows] = await database.run({
                sql: `SELECT * FROM ${tableName} WHERE id = @id`,
                params: { id: req.params.id }
            });
            res.status(200).send({ data: rows });
        } catch (err) {
            logger.error(`Error when retrieving joke with id: ${req.params.id}`, { err })
            res.status(500).send({ error: 'An error occurred while retrieving the joke' });
        }
    }
});


app.post('/jokes', async (req, res) => {
    const id = uuidv4();
    const joke = req.body.joke;
    const punchline = req.body.punchline;
    const rating = req.body.rating;
    if (!joke || !punchline || !rating) {
        res.status(400).send({ message: 'Missing required fields' });
    } if (typeof joke !== 'string') {
        res.status(400).send({ message: 'joke must be in format: STRING' })
    } if (typeof punchline !== 'string') {
        res.status(400).send({ message: 'punchline must be in format: STRING' })
    } if (typeof rating !== 'number' || rating > 10 || rating < 0) {
        res.status(400).send({ message: 'rating must be in format: INTEGER and cannot be higher than 10' })
    } else {
        try {
            logger.info('Received request to post joke', { requestBody: req.body });
            await database
                .table(tableName)
                .insert({
                    id: id,
                    joke: joke,
                    punchline: punchline,
                    rating: rating
                });
            res.status(200).send({
                message: 'Item added successfully',
                data: { payload: req.body }
            });
        } catch (err) {
            logger.info('Error while adding joke', { requestBody: req.body });
            res.status(500).send({ error: 'An error occurred while adding the joke to the database' });
        }
    }
});

app.post('/rate/:id', async (req, res) => {
    const id = req.params.id;
    const rating = req.body.rating;
    logger.info(`Received request to update rating of joke ${id}`)

    // Validate rating
    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
        return res.status(400).send({ message: 'Rating must be a number between 0 and 10' });
    }

    try {
        // Run the transaction
        await database.runTransaction(async (err, transaction) => {
            if (err) {
                throw err;
            }
            // Execute the update statement
            const updatedJoke = await transaction.update(tableName, [
                {
                    id: id,
                    rating: rating
                }
            ]
            )
            // Commit the transaction
            await transaction.commit();

            logger.info(`Successfully updated rating of joke ${id}`);
            res.status(200).send({ message: 'Joke rating updated successfully', updatedJoke });
            await transaction.end()
        });
    } catch (err) {
        logger.error('Error updating joke:', err);
        res.status(500).send({ error: 'An error occurred while updating the joke rating' });
    }
});



/*app.delete('/jokes/delete/:id', async (req, res) => {
    try {
        await database.runTransaction(async (transaction) => {
            await transaction.delete(tableName, req.params.id);
        });
        res.status(200).send({ message: `Joke with id ${req.params.id} successfully deleted` });
    } catch (err) {
        console.error('Error deleting joke from database:', err);
        res.status(500).send({ error: 'An error occurred while deleting the joke from the database' });
    }
});
*/

app.use((req, res) => {
    res.status(404).send({ message: '404 Not a valid endpoint' });
});