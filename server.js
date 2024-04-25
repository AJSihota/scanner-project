const path = require("path");
const express = require("express");
const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const config = require("./webpack.config.js");
const Solium = require("solium");
const bodyParser = require("body-parser");
const { readFile, writeFile } = require("fs/promises");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
require("dotenv").config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);

const isDeveloping = process.env.NODE_ENV !== "production";
const port = isDeveloping ? 3001 : process.env.PORT;
const ScanResult = require("./models/scanResult");
const connectDB = require("./db");
const User = require("./models/User");
const session = require("express-session");
const { exec } = require("child_process");
const fs = require("fs");

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

app.use(cors());


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
      User.findOrCreate(
        { googleId: profile.id },
        {
          username: profile.displayName, // use the part before "@" in email as username
          email: profile.emails[0].value,
          googleId: profile.id,
          availableScans: 3,
          // note: no password is set for Google users
        },
        function (err, user) {
          return done(err, user);
        }
      );
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// STripe Products
const products = {
  basic: {
    priceId: 'price_1ObI50B57ct9p2XTCV6QOPQa',
    scansToAdd: 2
  },
  premium: {
    priceId: 'price_1ObI5dB57ct9p2XTByqooFe6',
    scansToAdd: 40
  },
  enterprise: {
    priceId: 'price_1ObI6IB57ct9p2XTB1uciB6z',
    scansToAdd: 80
  }
};

app.post('/create-checkout-session', async (req, res) => {
  const { productType } = req.body;

  if (!products[productType]) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = products[productType];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: product.priceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://frontend-byb.firebaseapp.com/dashboard/app',
      cancel_url: 'https://frontend-byb.firebaseapp.com/dashboard/app',
      metadata: { productType }
    });

    res.json({ sessionId: session.id, url: session.url});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const productType = session.metadata.productType;

    // Assuming the metadata contains the productType
    // Retrieve user based on the session.client_reference_id set when creating the session
    const user = await User.findById(session.client_reference_id);
    if (user) {
      const product = products[productType];
      if (product) {
        user.availableScans += product.scansToAdd;
        await user.save();
        console.log(`Updated user scans: ${user.availableScans}`);
      }
    }
  }

  res.json({ received: true });
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

// Your endpoint or function to analyze Solidity code
app.post("/analyzeMythril", async (req, res) => {
  console.log('end point hit 2')
  const sourceCode = req.body.source; 
  const tempFilePath = "/usr/src/app/tmp/tmpfile.sol"; 
  const flattenedFilePath = "/usr/src/app/contracts/Flattened.sol";

  try {
    // Save the source code to a temporary file
    await writeFile(tempFilePath, sourceCode);
    // Use truffle-flattener to flatten the file
    exec(`npx hardhat flatten > ${tempFilePath}`, async (error, flattenedCode, stderr) => {
      if (error) {
        console.error(`Flattening error: ${error}`);
        return res.status(500).send("Error flattening contract.");
      }
      console.log('flattenedCode', flattenedCode)
      await writeFile(flattenedFilePath, flattenedCode);
    });

      // Call Mythril to analyze the flattened file
      exec(`myth analyze ${tempFilePath} --solc-json /usr/src/app/mappings.json`, (mythError, mythStdout, mythStderr) => {
        if (mythError) {
          console.error(`Mythril analysis error: ${mythError}`);
          return res.status(500).send("Error analyzing contract.");
        }

        if (mythStdout) {
          console.log(`Mythril analysis result: ${mythStdout}`)
          res.send(mythStdout);
        } else {
          console.error(`Mythril analysis error: ${mythStderr}`);
          res.status(500).send(mythStderr);
        }
      });
    
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing contract.");
  }
});

app.post('/create-checkout-session', async (req, res) => {
  const { priceId } = req.body; // priceId is the ID of the Stripe pricing plan
  const user = req.user;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://frontend-byb.firebaseapp.com/',
      cancel_url: 'https://frontend-byb.firebaseapp.com/',
      client_reference_id: user._id.toString(),
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(200).json({
      authenticated: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email, 
        availableScans: req.user.availableScans
      }
    });
  }
);

// Endpoint to check the number of available scans for the authenticated user
app.get("/availableScans", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const userId = req.user._id; // Get user ID from the authenticated request

  try {
    const user = await User.findById(userId); // Find user by ID
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with the number of available scans
    return res.json({ availableScans: user.availableScans || 0 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching available scans" });
  }
});


app.post(
  "/scan",
  passport.authenticate("jwt", { session: false }),
 async (req, res) => {
    const userId = req.user._id;
    const fileName = req.body.fileName;
    console.log("userId=", userId);
    const { result } = req.body;
    const scanResult = new ScanResult({
      userId,
      result,
      contractName: fileName,
    });

    scanResult
      .save()
      .then(() => res.json({ message: "Scan result saved successfully!" }))
      .catch((err) => res.status(500).json({ error: err.message }));

      try {
        // Fetch the user and check availableScans
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).send("User not found.");
        }
        
        if (user.availableScans > 0) {
          user.availableScans -= 1; // Decrement available scans
          await user.save(); // Save the updated user record
          
          // Proceed with your existing code to analyze the scan...
          
        } else {
          return res.status(403).send("No available scans left.");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Error processing contract.");
      }
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
    scope: ["profile", "email"],
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
      `https://frontend-byb.firebaseapp.com/auth.html?token=${token}`
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
