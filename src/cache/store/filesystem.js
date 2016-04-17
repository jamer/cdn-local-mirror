import bunyan from 'bunyan';
import fs from 'fs';

const log = bunyan.createLogger({name: 'filesystem'});

export default class FilesystemStore {
  haveSavedRequest(id) {
    return new Promise((resolve, reject) => {
      fs.access(`./data/fs/${id}-exists`, fs.F_OK, error => {
        if (error && error.code === 'ENOENT') {
          log.info(`exists(id=${id}) == ENOENT (okay)`);
          resolve(false);
        } else if (error) {
          log.info(`exists(id=${id}) == ${error}`);
          reject(error);
        } else {
          log.info(`exists(id=${id}) == true`);
          resolve(true);
        }
      })
    });
  }

  readSavedRequest(id) {
    const bodyPromise = new Promise((resolve, reject) => {
      fs.readFile(`./data/fs/${id}-body`, (error, data) => {
        if (error && error.code === 'ENOENT') {
          log.info(`read(id=${id}) error: ENOENT (okay)`);
          this.readSavedError(id).then(resolve).catch(reject);
        } else if (error) {
          log.info(`read(id=${id}) error: ${error}`);
          reject(error);
        } else {
          log.info(`read(id=${id}) okay`);
          resolve({statusCode: 200, body: data});
        }
      });
    });
    const contentTypePromise = new Promise((resolve, reject) => {
      fs.readFile(`./data/fs/${id}-contentType`, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
    return bodyPromise.then(response => {
      if (response.statusCode === 200) {
        return contentTypePromise.then(contentType => {
          response.contentType = contentType;
          return response;
        });
      } else {
        return response;
      }
    });
  }

  readSavedError(id) {
    return new Promise((resolve, reject) => {
      fs.readFile(`./data/fs/${id}-statusCode`, (error, data) => {
        if (error) {
          log.info(`readError(id=${id}) error: ${error}`);
          reject(error);
        } else {
          const statusCode = +data;
          log.info(`readError(id=${id}) okay: ${statusCode}`);
          resolve({statusCode: statusCode});
        }
      });
    });
  }

  storeRequest(id, description, contentType, body) {
    return new Promise((resolve, reject) => {
      fs.writeFile(`./data/fs/${id}-exists`, description);
      fs.writeFile(`./data/fs/${id}-description`, description);
      fs.writeFile(`./data/fs/${id}-contentType`, contentType);
      fs.writeFile(`./data/fs/${id}-body`, body, {mode: 0o600}, error => {
        if (error) {
          log.info(`write(id=${id}, description=${description}, contentType=${contentType}, body) error: ${error}`);
          reject(error);
        } else {
          log.info(`write(id=${id}, description=${description}, contentType=${contentType}, body) okay`);
          resolve();
        }
      });
    });
  }

  storeRequestError(id, description, statusCode) {
    return new Promise((resolve, reject) => {
      fs.writeFile(`./data/fs/${id}-exists`, description);
      fs.writeFile(`./data/fs/${id}-description`, description);
      fs.writeFile(`./data/fs/${id}-statusCode`, statusCode);
      fs.writeFile(`./data/fs/${id}`, '', {mode: 0o000}, error => {
        if (error) {
          log.info(`writeError(id=${id}, description=${description}, statusCode=${statusCode}) error: ${error}`);
          reject(error);
        } else {
          log.info(`writeError(id=${id}, description=${description}, statusCode=${statusCode}) okay`);
          resolve();
        }
      });
    });
  }
}
