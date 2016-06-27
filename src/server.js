const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');
const fs = require('fs');
const port = 8443;

const server = new Hapi.Server();

server.connection({
  port: port,
  tls: {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
  }
});

server.register(Inert, (err) => {
  if(err) throw err;
  server.route([
    {
      method: 'get',
      path: '/',
      handler: (request, reply) => {
        const path = Path.join(__dirname, '../public/index.html');
        reply.file(path);
      }
    },
    {
      method: 'get',
      path: '/public/{params*}',
      handler: {
        directory: {
          path: 'public'
        }
      }
    }
  ]);
});

server.start((err) => {
  if(err) throw err;
  console.log(`server running on port: ${server.info.uri}`);
});
