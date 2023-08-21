const path = require("path");
const express = require("express");
const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const config = require("./webpack.config.js");
const Solium = require("solium");
const bodyParser = require("body-parser");
const { readFile } = require("fs/promises");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

const isDeveloping = process.env.NODE_ENV !== "production";
const port = isDeveloping ? 3001 : process.env.PORT;
const ScanResult = require("./models/scanResult");
const connectDB = require("./db");
const User = require("./models/User");
const session = require("express-session");
// reqy

const app = express();

connectDB();

const jsonParser = bodyParser.json();
let newUser;

const createUser = () => {
  // Create a new user
  newUser = new User({
    username: "admin@admin.com",
    password: "admin", // This should be hashed using a library like bcrypt before saving
  });

  newUser
    .save()
    .then(() => console.log("User created!"))
    .catch((err) => console.error(err));

  return newUser;
};

app.use(
  cors({
    origin: isDeveloping
      ? "http://localhost:3000"
      : "https://frontend-byb.firebaseapp.com",
    credentials: true,
  })
);

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(req.body);
  next();
});

app.use(
  session({
    secret: "blockyblock",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "blockyblock",
};

passport.use(
  new JwtStrategy(opts, async function (jwt_payload, done) {
    try {
      console.log("jwt_payload.sub", jwt_payload);
      const user = await User.findById(jwt_payload.sub);
      if (user) {
        return done(null, user);
      } else {
        // or you could create a new account
        // createUser();
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://solidity-scanner.onrender.com/auth/google/callback",
    },
    function (token, tokenSecret, profile, done) {
      console.log('profile is', profile)
      User.findOrCreate({ googleId: profile.id }, {
        username: profile.displayName, // use the part before "@" in email as username
        email: profile.emails[0].value,
        googleId: profile.id
        // note: no password is set for Google users
    }, function (err, user) {
        return done(err, user);
    });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.post("/login", async function (req, res) {
  // Replace with your authentication logic
  const { username, password } = req.body;

  try {
    // Try to find user
    const user = await User.findOne({ username });

    // If user not found, return error
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Here you would usually check if the provided password is correct
    // ...

    // Sign the JWT with the user id
    const token = jwt.sign(
      { sub: user._id, username: user.username },
      "blockyblock",
      { expiresIn: "1h" }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.post("/logout", (req, res) => {
  req.logout();
  res.json({ success: true });
});

app.get(
  "/api/checkAuth",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log("req user is", req.user);
    res.status(200).json({ authenticated: true });
  }
);

app.post(
  "/scan",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.user._id;
    console.log("userId=", userId);
    const { result } = req.body;
    const scanResult = new ScanResult({
      userId,
      result,
    });

    scanResult
      .save()
      .then(() => res.json({ message: "Scan result saved successfully!" }))
      .catch((err) => res.status(500).json({ error: err.message }));
  }
);

app.post("/upload", jsonParser, async function response(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).json({ body: "OK" });
  }

  async function content(path) {
    return await readFile(path, "utf8");
  }
  const text = req.body.source;

  const file = await content("./contracts/Migrations.sol");
  console.log("file", file);

  console.log("bloops", req.body);
  sourceCode = text;
  // Parse Solidity code
  const errors = Solium.lint(sourceCode, {
    extends: "solium:recommended",
    plugins: ["security"],
    rules: {
      quotes: ["error", "double"],
      "double-quotes": [2], // returns a rule deprecation warning
      "pragma-on-top": 1,
    },
    options: { returnInternalIssues: true },
  });

  // errors.forEach(console.log);
  console.log(JSON.stringify(req.body));
  // access-control-allow-origin: *
  // referrer-policy: no-referrer
  // access-control-allow-headers: Origin, X-Requested-With, Content-Type, Accept

  res.json({
    errors: errors,
    sourceCode: JSON.stringify(req.body),
  });
});

app.get(
  "/userScans",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = req.user._id;

    try {
      const scanResults = await ScanResult.find({ userId });
      res.json(scanResults);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "Error occurred while fetching scan results" });
    }
  }
);

// Redirect to Google authentication
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);


// The callback after Google has authenticated the user
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  function (req, res) {
    if (!req.user) {
      return res.redirect("/login?error=No user info retrieved from Google");
    }

    // Generate JWT for the user
    const token = jwt.sign(
      { sub: req.user._id, username: req.user.username },
      "blockyblock",
      { expiresIn: "1h" }
    );

    // Redirect back to frontend with the token
    res.redirect(
      `https://frontend-byb.firebaseapp.com/login?token=${token}`
    );
  }
);

app.listen(3001, "0.0.0.0", function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info(
    "==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.",
    3001,
    3001
  );
});
