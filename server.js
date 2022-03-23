const app = require('./app');
const logger = require('./logger');

const port = process.env.PORT || 8080;
app.set('port', port);
logger.info(port)
app.listen(port);
