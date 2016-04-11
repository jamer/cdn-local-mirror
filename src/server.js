import bunyan from 'bunyan';
import http from 'http';

import Cache from './cache/cache';
import * as whitelist from './whitelist';

const cache = new Cache();
const log = bunyan.createLogger({name: 'filesystem'});

const PORT = process.env.PORT || 8000;

http.createServer((req, res) => {
  req.protocol = 'http';
  req.port = PORT;

  const host = req.headers.host;

  if (!whitelist.shouldMirror(host)) {
    log.info(`Item not on whitelist: ${host}`);
    res.statusCode = 404;
    res.end();
    return;
  }

  cache.fetch(req)
  .then(responseData => {
    const statusCode = responseData.statusCode;
    const contentType = responseData.contentType;
    const body = responseData.body;

    res.setHeader('Cache-Control', 'max-age=86400');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.statusCode = statusCode;
    res.end(body);
  })
  .catch(error => {
    log.error(error);
    res.statusCode = 500;
    res.end('<h1>Mirror failure</h1>');
  });
}).listen(PORT);
