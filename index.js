const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <html>
        <head>
            <title>Node Server Running</title>
        </head>
        <body style="font-family: Arial; text-align:center; margin-top:50px;">
            <h1>✅ Node.js Server Connected Successfully</h1>
            <p>Your deployment is working.</p>
            <p>Port: ${PORT}</p>
        </body>
        </html>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});