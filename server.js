require('dotenv').config({ path: '.env' });

const http = require('http');
const fs = require('fs');
const { parse }= require('querystring');
const { MongoClient } = require('mongodb');
const { addUser, addExercise, fetchLog } = require('./db.js');

const databaseUrl = process.env.DATABASE;

function sendJSONResponse(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function parseRequestBody(request, callback) {
  const FORM_URLENCODED = 'application/x-www-form-urlencoded';

  if (request.headers['content-type'] === FORM_URLENCODED) {
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });

    request.on('end', () => {
      callback(parse(body));
    });
  } else {
    callback(null);
  }
}

const requestHandler = (req, res) => {
  if (req.url === '/') {
    return fs.readFile('views/index.html', (err, html) => {
      if (err) throw err;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
  }

  if (req.method === 'POST' && req.url === '/new-user') {
    return parseRequestBody(req, body => {
      const username = body.username.toLowerCase();

      MongoClient.connect(databaseUrl, { useNewUrlParser: true })
        .then(client => {
          const db = client.db('exercise-tracker');
          return addUser(db, username);
        })
        .then(result => sendJSONResponse(res, result))
        .catch(console.error);
    });
  }

  if (req.method === 'POST' && req.url === '/new-exercise') {
    return parseRequestBody(req, body => {
      MongoClient.connect(databaseUrl, { useNewUrlParser: true })
        .then(client => {
          const db = client.db('exercise-tracker');
          return addExercise(db, body);
        })
        .then(result => sendJSONResponse(res, result))
        .catch(console.error);
    })
  }

  if (req.method === "POST" && req.url === '/log') {
    return parseRequestBody(req, body => {
      MongoClient.connect(databaseUrl, { useNewUrlParser: true })
        .then(client => {
          const db = client.db('exercise-tracker');
          return fetchLog(db, body);
        })
        .then(result => {
          const obj = {
            userId: result.user._id,
            username: result.user.username,
            count: result.log.length,
            from: body.startTime ? body.startTime : null,
            to: body.endTime ? body.endTime : null,
            log: result.log
          };

          sendJSONResponse(res, obj);
        })
        .catch((error) => sendJSONResponse(res, {
          error: error.message,
        }));
    });
  }
};

const server = http.createServer(requestHandler);

server.listen(process.env.PORT || 3400, err => {
  if (err) throw err;

  console.log(`Server running on PORT ${server.address().port}`);
});
