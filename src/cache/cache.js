import bunyan from 'bunyan';
import childProcess from 'child_process';
import { SHA3Hash } from 'sha3';
import request from 'request-promise';

import FilesystemStore from './store/filesystem';

const log = bunyan.createLogger({name: 'filesystem'});

const makeDescription = req => `${req.method} ${req.headers.host}${req.url}`;
const makeId = str => {
  const digest = new SHA3Hash(256);
  digest.update(str);
  return digest.digest('hex');
};

export default class Cache {
  constructor() {
    this.store = new FilesystemStore();
  }

  fetch(req) {
    const store = this.store;
    const description = makeDescription(req);
    const id = makeId(description);

    log.info(`Incoming request for ${description}`);

    return store.haveSavedRequest(id)
    .then(yepWeHaveIt => {
      if (yepWeHaveIt) {
        return store.readSavedRequest(id);
      } else {
        return fetchAndStoreResult(store, req, id, description);
      }
    })
    .catch(error => {
      log.error(error);
      return {statusCode: 500, body: '<h1>Mirror failure</h1>'};
    });
  }
}

const fetchAndStoreResult = (store, req, id, description) => {
  log.info(`Forwarding request to remote`);

  return doRemoteHTTP(req)
  .then(response => {
    log.info('Remote responded with HTTP 200-ish');
    const contentType = response.headers['content-type'];
    const body = response.body;
    return store.writeRequest(id, description, contentType, body)
    .then(() => {
      return {statusCode: 200, contentType: contentType, body: body};
    });
  })
  .catch(error => {
    const statusCode = error && error.response && error.response.statusCode;
    if (statusCode) {
      log.info(`Remote responded with error: ${statusCode}`);
      return store.writeRequestError(id, description, statusCode)
      .then(() => {
        return {statusCode: statusCode};
      });
    } else {
      log.error(`Unknown request error: ${error}`);
      throw error;
    }
  });
};

const doRemoteHTTP = req => {
  const host = req.headers.host.replace(/:.*/, ''); // FIXME: better escaping

  return dnsLookup(host)
  .then(ip => {
    const method = req.method;
    const protocol = req.protocol;
    const port = req.port;
    const uri = `${protocol}://${ip}:${port}${req.url}`;
    log.info({uri: uri}, 'Downloading');

    return request({
      method: method,
      uri: uri,
      headers: {'host': host},
      encoding: null,
      resolveWithFullResponse: true
    });
  });
};

const dnsLookup = host => {
  return new Promise((resolve, reject) => {
    // Force a DNS network lookup using /usr/bin/host which will
    // not read /etc/hosts in case the user has the host set to
    // 127.0.0.1 which could lead to an infinite loop.
    childProcess.execFile('host', [host], (error, stdout, stderr) => {
      if (error) {
        log.error(`/usr/bin/host error: ${error}`);
        reject(error);
      } else {
        const lines = stdout && stdout.split('\n');

        const ipv4s = lines && lines
            .map(line => line.match(/has address (.*)/))
            .filter(a => a);
        const ipv6s = lines && lines
            .map(line => line.match(/has IPv6 address (.*)/))
            .filter(a => a)
            .map(ipv6Address => `[${ipv6Address}]`);
        const ip = (ipv4s && ipv4s[0][1]) || (ipv6s && ipv6s[0][1]);

        if (ip) {
          resolve(ip);
        } else {
          reject(`/usr/bin/host produced no IPs for host=${host}: ${stdout}`)
        }
      }
    });
  });
};
