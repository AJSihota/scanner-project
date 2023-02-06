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
    const sourceCode = req.body.source;

    const errors = Solium.lint(sourceCode, {
            "extends": "solium:recommended",
            "plugins": ["security"],
            "rules": {
                    "quotes": ["error", "double"],
                    "double-quotes": [2],   // returns a rule deprecation warning
                    "pragma-on-top": 1
            },
    
            "options": { "returnInternalIssues": true }
    });
    
    // errors.forEach(console.log);
    // access-control-allow-origin: *
    // referrer-policy: no-referrer
    // access-control-allow-headers: Origin, X-Requested-With, Content-Type, Accept
    
    
    res.json({
      errors: errors,
    })

});

export default app;