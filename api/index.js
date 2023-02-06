// const path = require('path');
// const webpack = require('webpack');
// const webpackMiddleware = require('webpack-dev-middleware');
// const webpackHotMiddleware = require('webpack-hot-middleware');
// const config = require('./webpack.config.js');
import { lint } from 'solium';
import { json } from 'body-parser';
import { readFile } from 'fs/promises';

const app = require('express')();
import { v4 } from 'uuid';

const jsonParser = json()

app.get('/api', (req, res) => {
  const path = `/api/item/${v4()}`;
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
  res.end(`Hello! Go to item: <a href="${path}">${path}</a>`);
});

app.get('/api/item/:slug', (req, res) => {
  const {
    slug
  } = req.params;
  res.end(`Item: ${slug}`);
});

// test an API Post request
app.post('/api/testing', jsonParser, async function response(req, res) {
    // Output JSON body
    console.log(req.body);
    res.json({
        body: req.body
    });
});

app.post('/api/upload', jsonParser, async function response(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*');
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    return res.status(200).json(({
      body: "OK"
    }))
  }


//   async function content(path) {
//     return await readFile(path, 'utf8')
//   }
  const text = req.body.source;

//   const file = await content('./contracts/Migrations.sol')
//   console.log('file', file);

//   console.log('bloops', req.body);
  sourceCode = text;

//   const errors = lint(sourceCode, {
//     "extends": "solium:recommended",
//     "plugins": ["security"],
//     "rules": {
//       "quotes": ["error", "double"],
//       "double-quotes": [2], // returns a rule deprecation warning
//       "pragma-on-top": 1
//     },

//     "options": {
//       "returnInternalIssues": true
//     }
//   });

  // errors.forEach(console.log);
  console.log(JSON.stringify(req.body));
  // access-control-allow-origin: *
  // referrer-policy: no-referrer

  res.json({
    // errors: errors,
    sourceCode: JSON.stringify(req.body)
  })

});

export default app;