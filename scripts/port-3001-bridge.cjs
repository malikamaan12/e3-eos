const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: 'http://localhost:3000' + req.url });
  res.end();
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Port 3001 forwarder listening and redirecting to port 3000');
});
