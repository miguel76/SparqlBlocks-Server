const socket = require('socket.io');
const winston = require('winston');
require('winston-loggly-bulk');
const winstonAwsCloudWatch = require('winston-aws-cloudwatch');

if (process.env.LOGGLY_SUBDOMAIN && process.env.LOGGLY_TOKEN) {
  winston.add(winston.transports.Loggly, {
    token: process.env.LOGGLY_TOKEN,
    subdomain: process.env.LOGGLY_SUBDOMAIN,
    tags: process.env.LOGGLY_TAG ? [process.env.LOGGLY_TAG] : [],
    json:true
  });
}

if (process.env.AWS_CW_LOG_GROUP_NAME && process.env.AWS_CW_LOG_STREAM_NAME) {
  winston.add(winstonAwsCloudWatch, {
    logGroupName: process.env.AWS_CW_LOG_GROUP_NAME,
    logStreamName: process.env.AWS_CW_LOG_STREAM_NAME,
    awsConfig: {
      accessKeyId: process.env.AWS_CFG_KEY_ID,
      secretAccessKey: process.env.AWS_CFG_ACCESS_KEY,
      region: process.env.AWS_CFG_REGION
    }
  });
}

module.exports = function (httpServer) {
  var io = socket(httpServer);
  io.on('connection', function(socket) {
    var traceEvent = function(event) {
      event.connectionId = socket.id;
      winston.log('info', 'client-event', {event: event});
    };
    traceEvent({type: 'connection'});
    [ 'load-snapshot', 'save-snapshot',
      'new-workspace', 'new-client', 'new-session',
      'create', 'delete', 'move', 'ui'].map(function(eventType) {
      socket.on(eventType, traceEvent);
    });
    socket.on('disconnect', function(){
      traceEvent({type: 'disconnection'});
    });
  });
}
