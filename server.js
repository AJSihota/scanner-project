const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const Solium = require('solium');
const bodyParser = require('body-parser');
const { readFile } = require('fs/promises');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping ? 3001 : process.env.PORT;
const ScanResult = require('./models/scanResult');
const connectDB = require('./db');

const app = express();

connectDB();

const jsonParser = bodyParser.json()

app.use(cors({
  origin: isDeveloping ? 'http://localhost:3000' : 'https://frontend-byb.firebaseapp.com',
  credentials: true,
}));

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(req.body);
  next();
});

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'blockyblock'
};

passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
  if (jwt_payload.username === 'admin@admin.com') {
    return done(null, { username: 'admin@admin.com' });
  } else {
    return done(null, false);
  }
}));

app.post('/login', function(req, res) {
  // Replace with your authentication logic
  if (req.body.username === 'admin@admin.com' && req.body.password === 'admin') {
    const user = { username: 'admin@admin.com' };
    const token = jwt.sign(user, 'blockyblock', { expiresIn: '1h' }); 
    res.json({ success: true, token });
  } else {
    res.json({ success: false, message: 'Invalid username or password' });
  }
});



app.post('/logout', (req, res) => {
  req.logout();
  res.json({ success: true });
});


app.get('/api/checkAuth', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.status(200).json({ authenticated: true });
});

app.post('/scan', passport.authenticate('jwt', { session: false }), (req, res) => {
  const userId = req.user.id;
  const { result } = req.body;
  const scanResult = new ScanResult({
    userId,
    result
  });

  scanResult.save()
    .then(() => res.json({ message: 'Scan result saved successfully!' }))
    .catch(err => res.status(500).json({ error: err.message }));
});


app.post('/upload', jsonParser, async function response(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*');
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if(req.method === 'OPTIONS') { return res.status(200).json(({ body: "OK" })) }


  async function content(path) {  
    return await readFile(path, 'utf8')
  }
  const text = req.body.source; 
  
  const file = await content('./contracts/Migrations.sol')
  console.log('file', file);

  console.log('bloops', req.body); 
        sourceCode = text;
// Parse Solidity code
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
// access-control-allow-origin: *
// referrer-policy: no-referrer
// access-control-allow-headers: Origin, X-Requested-With, Content-Type, Accept


res.json({
  errors: errors,
  sourceCode: JSON.stringify(req.body)
})
});

app.listen(3001, '0.0.0.0', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', 3001, 3001);
});



