// import all the modules you need
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const fileUpload = require('express-fileupload');

// set up express-validator
const { check, validationResult } = require('express-validator');

// Connect to DB
mongoose.connect('mongodb://localhost:27017/DellComplaints', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Define admin user and password
const User = mongoose.model('User', {
  uName: String,
  uPass: String,
});

var nameRegex = /^[a-zA-Z0-9]{1,}\s[a-zA-Z0-9]{1,}$/;

// Define Model
const Order = mongoose.model('Order', {
  name: String,
  email: String,
  description: String,
  uploadImageName: String,
});

// set up the app
var myApp = express();

// Define Port
const port = 8080;

// set up the body-parser middleware
myApp.use(express.urlencoded({ extended: false }));

// define/set the paths to public folder and views folder

myApp.set('views', path.join(__dirname, 'views')); // set a value for express
myApp.use(express.static(__dirname + '/public')); // set up a middleware to server static files

myApp.set('view engine', 'ejs');

myApp.use(
  session({
    secret: 'Mydog',
    resave: false,
    saveUninitialized: true,
  })
);
myApp.use(fileUpload());
// define the routes

// define the route for index page method get
myApp.get('/', function (req, res) {
  res.render('form');
});

// define the route for allcomplain page method get
myApp.get('/allcomplain', function (req, res) {
  if (req.session.loggedIn) {
    // write some code to fetch all the complaints from db and send to the view allcomplain
    Order.find({}).exec(function (err, orders) {
      console.log(err);
      console.log(orders);
      res.render('allcomplain', { orders: orders }); // will render views/allcomplain.ejs
    });
  } else {
    res.redirect('/login');
  }
});

// Define module logout
myApp.get('/logout', function (req, res) {
  // destroy the whole session login session and reset
  req.session.uName = '';
  req.session.loggedIn = false;
  res.redirect('/login');
});

// Route to login page
myApp.get('/login', function (req, res) {
  res.render('login'); // will render views/login.ejs
});

// Post method for login page to check correct uname and password
myApp.post('/login', function (req, res) {
  // fetch username and pass
  var uName = req.body.uname;
  var uPass = req.body.upass;

  // Search it in the database
  User.findOne({ uName: uName, uPass: uPass }).exec(function (err, user) {
    // set up the session variables for logged in users
    console.log('Errors: ' + err);
    if (user) {
      console.log(req.session.uName);
      req.session.uName = user.uName;
      req.session.loggedIn = true;
      // redirect to dashboard
      res.redirect('/allcomplain');
    } else {
      res.redirect('/login');
    }
  });
});

// Get all complains
myApp.get('/print/:orderid', function (req, res) {
  // write some code to fetch a complaint and create pageData
  var orderId = req.params.orderid;
  Order.findOne({ _id: orderId }).exec(function (err, order) {
    console.log(order);
    res.render('complain', order); // render complain.ejs with the data from order
  });
});

// to delete a complaints from the database
myApp.get('/delete/:orderid', function (req, res) {
  // --------add some logic to put this page behind login---------
  var orderId = req.params.orderid;
  Order.findByIdAndDelete({ _id: orderId }).exec(function (err, order) {
    res.render('delete', order); // render delete.ejs with the data from order
  });
});

// Route to Edit page for complaints
myApp.get('/edit/:orderid', function (req, res) {
  // --------add some logic to put this page behind login---------
  var orderId = req.params.orderid;
  // logic to show the complaints in a form with the details
  Order.findOne({ _id: orderId }).exec(function (err, order) {
    res.render('edit', order); // render edit.ejs with the data from order
  });
});

// process the edited form from admin
myApp.post('/editprocess/:orderid', function (req, res) {
  if (!req.session.loggedIn) {
    res.redirect('/login');
  } else {
    var name = req.body.name; // the key here is from the name attribute not the id attribute
    var email = req.body.email;
    var description = req.body.description;
    var uploadImageName = req.files.uploadImage.name;
    var uploadImageFile = req.files.uploadImage; // this is a temporary file in buffer.
    // check if the file already exists or employ some logic that each filename is unique.
    var uploadImagePath = 'public/uploads/' + uploadImageName;
    // move the temp file to a permanent location mentioned above
    uploadImageFile.mv(uploadImagePath, function (err) {
      console.log(err);
    });
    // find the request in database and update it
    var orderId = req.params.orderid;
    Order.findOne({ _id: orderId }).exec(function (err, order) {
      // update the request and save
      order.name = name;
      order.email = email;
      order.description = description;
      order.uploadImageName = uploadImageName;
      order.save();

      res.render('complain', order); // render request.ejs with the data from request
    });
  }
});

// handle post
myApp.post(
  '/process',
  [
    check('description', 'Please enter a description.').not().isEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('name', 'Please enter firstname and lastname').matches(nameRegex),
  ],

  function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render('form', { er: errors.array() });
    } else {
      // Fetch Info from FORM
      var name = req.body.name;
      var email = req.body.email;
      var description = req.body.description;

      var uploadImageName = req.files.uploadImage.name;
      // get the actual file
      var uploadImageFile = req.files.uploadImage; // this is a temporary file in buffer.

      // save the file
      // check if the file already exists or employ some logic that each filename is unique.
      var uploadImagePath = 'public/uploads/' + uploadImageName;
      // move the temp file to a permanent location mentioned above
      uploadImageFile.mv(uploadImagePath, function (err) {
        console.log(err);
      });

      // create an object with the fetched data to send to the view
      var pageData = {
        name: name,
        email: email,
        description: description,
        uploadImageName: uploadImageName,
      };

      // create an object from the model to save to DB
      var myOrder = new Order(pageData);
      // save it to DB
      myOrder.save();

      // send the data to the view and render it
      res.render('checkout', pageData);
    }
  }
);

myApp.get('/setup', function (req, res) {
  let userData = [
    {
      uName: 'admin',
      uPass: 'admin',
    },
  ];
  User.collection.insertMany(userData);
  res.send('data added');
});

// start the server (listen at a port)
myApp.listen(port);
console.log(`Everything executed, open in the browser http://localhost:${port}`);
