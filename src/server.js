import bunyan from 'bunyan';
import fs from 'fs';
import https from 'https';
import http from 'http';

import Cache from './cache/cache';
import * as whitelist from './whitelist';

const cache = new Cache();
const log = bunyan.createLogger({name: 'filesystem'});

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const httpsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(httpsOptions, (req, res) => {
  req.protocol = 'https';
  req.port = HTTPS_PORT;
  handleRequest(req, res);
}).listen(HTTPS_PORT);

http.createServer((req, res) => {
  req.protocol = 'http';
  req.port = HTTP_PORT;
  handleRequest(req, res);
}).listen(HTTP_PORT);

const handleRequest = (req, res) => {
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
}
