import fs from 'fs';

const whitelist = {};
const domains = fs.readFileSync('whitelist.txt', 'utf-8').split('\n');
for (let domain of domains) {
  domain = domain.replace(/#.*/, '').trim();
  if (domain !== '') {
    whitelist[domain] = true;
  }
}

export const shouldMirror = domain => {
  if (whitelist['*']) {
    return true;
  }

  if (whitelist[domain]) {
    return true;
  }

  const labels = domain.split('.');
  for (let superdomain = labels.pop(); labels.length !== 0; superdomain = `${labels.pop()}.${superdomain}`) {
    if (whitelist[superdomain]) {
      return true;
    }
  }

  return false;
};
