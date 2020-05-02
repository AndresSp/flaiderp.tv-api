const express = require('express');
const session = require('express-session');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const axios = require('axios').default;
const handlebars = require('handlebars');
const dotenv = require('dotenv').config()

const secrets = dotenv.parsed

const TWITCH_CLIENT_ID = secrets.TWITCH_CLIENT_ID;
const TWITCH_SECRET    = secrets.TWITCH_SECRET;
const SESSION_SECRET   = secrets.SESSION_SECRET;
const CALLBACK_URL     = secrets.CALLBACK_URL;

const app = express();
app.use(session({
    secret: SESSION_SECRET, 
    resave: true, 
    saveUninitialized: true
}));

app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
    const options = {
      url: 'https://api.twitch.tv/helix/users',
      method: 'GET',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Authorization': 'Bearer ' + accessToken
      }
    };
    
    axios(options)
    .then((response) => response)
    .then((response) => {
        console.debug(response.data)
        done(null, response.data)
    })
    .catch((error) => {
        console.debug(error)
        done(error)
    })
  }

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});


passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

// Define a simple template to safely generate HTML with values from user's profile
var template = handlebars.compile(`
<html><head><title>Twitch Auth Sample</title></head>
<table>
    <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
    <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
    <tr><th>Display Name</th><td>{{display_name}}</td></tr>
    <tr><th>Bio</th><td>{{bio}}</td></tr>
    <tr><th>Image</th><td>{{logo}}</td></tr>
</table></html>`);

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
    if(req.session && req.session.passport && req.session.passport.user) {
      res.send(template(req.session.passport.user));
    } else {
      res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/auth/twitch">Try to auth</a></html>');
    }
  });
  
  app.listen(3000, function () {
    console.log('Twitch auth sample listening on port 3000!')
  });

