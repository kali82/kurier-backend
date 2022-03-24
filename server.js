const app = require('./app');
const logger = require('./logger');

const port = 8080;
app.set('port', 4000);
logger.info(port)
logger.info('8080')
app.listen('4000');
