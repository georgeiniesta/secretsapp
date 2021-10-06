//using dotenv MUST BE ON TOP ALWAYS
require('dotenv').config();
///
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const app = express()
//
// const encrypt = require('mongoose-encryption')
//instead of mongoose encryption
// const sha512 = require('js-sha512')
// //using bcrypt
// const bcrypt = require('bcrypt')
// const saltRounds = 10;

//Config express session
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

const GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate = require('mongoose-findorcreate')



app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
  extended: true
}))

//Goes here ALWAYS
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))
///
app.use(passport.initialize());
app.use(passport.session());
// passport.serializeUser(function(user, done) {
//   done(null, user);
// });
//
// passport.deserializeUser(function(id, done) {
//   User.findById(id, function(err, user) {
//     done(err, user);
//   });
// });



mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true
})
//for encryption create new schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});
//passportLocalMongoose this salts pwd
userSchema.plugin(passportLocalMongoose)

userSchema.plugin(findOrCreate)

//defining secret for encrypt as plugin and specify pw as encrypted flield
//secret as key

//fetching key

// userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields:['password']});

//
const User = new mongoose.model('User', userSchema);
//we will configure passport local configure
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
// passport.serializeUser(function(user, done) {
//   done(null, user);
// });
//
// passport.deserializeUser(function(user, done){
//   done(null, user)
// });
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    //path must be set up
    , userProfileUrl: 'http://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile)
    //findOrCreate is not from mongoose, so take it in mind
    // npm i mongoose-findorcreate
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', function(req, res) {
  res.render('home')
})

//from doc passport
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get('/login', function(req, res) {
  res.render('login')
})
app.get('/register', function(req, res) {
  res.render('register')
})
//passport and stuff authentication for render /secrests
app.get('/secrets', function(req, res){
  if(req.isAuthenticated()) {
    res.render('secrets')
  } else{
    res.redirect('/login')
  }
})

app.get('/logout', function(req, res){
  req.logout()
  res.redirect('/')
})


 // Method using bcrypt
// app.post('/register', function(req, res) {
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     })
//     newUser.save(function(err) {
//       if (err) {
//         console.log(err)
//       } else {
//         res.render('secrets')
//       }
//     })
//   });
//
// });
//
// app.post("/login",function(req,res){
//   const username = req.body.username
//   const password = req.body.password
//   User.findOne({email:username},function(err,foundUser){
//     if(err)
//     console.log(err);
//     else{
//       if(foundUser){
//         if(bcrypt.compareSync(password, foundUser.password))
//         res.render("secrets")
//         else
//         res.send("Invalid Credentials")
//       }
//     }
//   })
// })
//Finishes bcrypt method

//Using Passport Method
app.post('/register',function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if(err){
        console.log(err);
        res.redirect('/register')
      } else {
        passport.authenticate('local')(req, res, function(){
          res.redirect('/secrets')
        })
      }
    })

})

app.post('/login',function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  //passport Method
  req.login(user, function(err){
    if(err){
      console.log(err)
    } else {
      passport.authenticate('local')(req, res, function(){
        res.redirect('/secrets')
      })
    }
  })

})



app.listen(3000, function() {
  console.log('Server started on port 3000')
})
