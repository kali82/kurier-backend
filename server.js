const app = require('./app');
const logger = require('./logger');

const port = process.env.PORT || 4000;
app.set('port', port);
logger.info(port)
logger.info(process.env.PORT)
app.listen(process.env.PORT || 4000);
