const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const Solium = require('solium');
const bodyParser = require('body-parser')
const { readFile } = require('fs/promises')
const session = require('express-session');  // <-- require express-session
const cors = require('cors');

const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping ? 3001 : process.env.PORT;

const app = express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;



const jsonParser = bodyParser.json()

app.use(cors({
  origin: isDeveloping ? 'http://localhost:3000' : 'https://frontend-byb.firebaseapp.com',
  credentials: true,
}));

app.use(session({
  secret: 'blockyblock', 
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isDeveloping ? false : true,  // set this to false in development, true in production
    sameSite: 'lax',  // if in development, set to 'lax' else 'none'
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    domain: isDeveloping ? 'localhost' : '.frontend-byb.firebaseapp.com', // if in development, set to 'localhost' else '.yourdomain.com'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  function(username, password, done) {
    // Replace with your authentication logic
    if (username === 'admin@admin.com' && password === 'admin') {
      return done(null, { username: 'admin@admin.com' });
    } else {
      return done(null, false, { message: 'Invalid username or password' });
    }
  }
));

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(req.body);
  next();
});

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  if (username === 'admin@admin.com') {
    done(null, { username: 'admin@admin.com' });
  } else {
    done(null, false);
  }
});

app.post('/login', passport.authenticate('local'), function(req, res) {
  res.json({ success: true });
});

app.post('/logout', (req, res) => {
  req.logout();
  res.json({ success: true });
});


app.get('/api/checkAuth', (req, res) => {
  if(req.isAuthenticated()){
    res.status(200).json({ authenticated: true });
  } else {
    res.status(200).json({ authenticated: false });
  }
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



