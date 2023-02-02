const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const Solium = require('solium');
const bodyParser = require('body-parser')
const { readFile } = require('fs/promises')


const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping ? 3001 : process.env.PORT;

const app = express();

const jsonParser = bodyParser.json()


if (isDeveloping) {
  const compiler = webpack(config);
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));



} else {
  app.use(express.static(__dirname + '/dist'));

}

app.listen(port, '0.0.0.0', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
  
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post('/upload', jsonParser, async function response(req, res) {
  async function content(path) {  
    return await readFile(path, 'utf8')
  }
  const text = req.body.source; 
  
  const file = await content('./contracts/Migrations.sol')
  console.log('file', file);

  console.log('bloops', req.body); 
        sourceCode = text;

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
console.log(JSON.stringify(req.body));
res.json({
  errors: errors,
  sourceCode: JSON.stringify(req.body)
})
});