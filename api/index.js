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
    console.log(req.body);
    res.json({
        body: req.body
    });

});

export default app;