const http = require('http');

const server = http.createServer((req, res) => {
    res.end('Mi primer hola mundo!!!!');
});

server.listen(8080, () => {
    console.log('Escuchando en puerto 8080');
});