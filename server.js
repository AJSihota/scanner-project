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

app.use(session({ secret: 'blockyblock', resave: false, saveUninitialized: false }));
app.use(cors({
  origin: '*', 
  credentials: true,
}));

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
app.use(passport.initialize());
app.use(passport.session());  // <-- add this line after passport.initialize()

passport.use(new LocalStrategy(
  function(username, password, done) {
    // Here is the DB Lookup to verify login
    // DB Sample:
    // User.findOne({ username: username }, function (err, user) {
    //   if (err) { return done(err); }
    //   if (!user) { return done(null, false); }
    //   if (!user.verifyPassword(password)) { return done(null, false); }
    //   return done(null, user);
    // });
    if (username === 'admin@admin.com' && password === 'admin') {
      return done(null, { username: 'admin' });
    } else {
      return done(null, false, { message: 'Invalid username or password' });
    }
  }
));
passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  // Here you would usually look up the user in the database based on the username
  // For the sake of simplicity, we're just passing the username through
  if (username === 'admin') {
    done(null, { username: 'admin' });
  } else {
    done(null, false);
  }
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Referrer-Policy", "no-referrer");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(port, '0.0.0.0', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
  
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/dashboard/app');
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Referrer-Policy", "no-referrer");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
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

app.get('/api/checkAuth', (req, res) => {
  if(req.isAuthenticated()){
    res.status(200).json({ authenticated: true });
  } else {
    res.status(200).json({ authenticated: false });
  }
});