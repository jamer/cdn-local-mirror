# local-cdn

An HTTP proxy server designed to be used for only a small number of sites on
the Internet.  Probably for content that almost never changes, such as the CDNs
that carry jQuery, etc.

## Setup

Install the dependencies.

```bash
npm install
```

Make the data directory and create a whitelist.txt with a list of domains that you want to mirror.

```bash
mkdir -p data/fs
echo bootstrapcdn.com >> whitelist.txt
```

Start the server.

```bash
node src
```

The server listens on ports 80 and 443. Any incoming requests whose domain
isn't within the white list are immediately discarded and are given HTTP 500.
Use the special domain `*` in the white list to allow all requests.

For each request that comes through, local-cdn will check to see if it's
already downloaded it. If it has, it returns that. Otherwise, it goes ahead and
downloads an initial version of the file, saves it, and replies with that.

Tell your web browser to use local-cdn for the domains you want. You may want
to use your hosts file for this, but any method is fine.

```bash
echo 127.0.0.1 bootstrapcdn.com >> /etc/hosts
```

Remove or comment out the entries from the hosts file later to restore previous
behavior and allow your system to connect directly to those sites.

## How it works

Right now there is only a rough filesystem backing for saved content. HTTP data
is saved in the `./data/fs/` directory.

At the moment we never check to see if the content was updated on the remote
server so once a URL is mirrored to your local computer it is permanent. This
makes it really only applicable for mirroring domains in which URL content is
not expected to change.

## Project maturity

Pre-alpha. Use at your own risk.

## How to contribute

Report issues on Github or make pull requests.
