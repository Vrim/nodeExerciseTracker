const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/exercise-track");
var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: String
});
var User = mongoose.model("User", userSchema);
var exerciseSchema = new Schema({
  userid: String,
  description: String,
  duration: Number,
  date: Date
});
var Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/add", async (req, res) => {
  var userid = req.body.userId;
  var description = req.body.description;
  var duration = parseInt(req.body.duration);
  var date = req.body.date;
  var user = await User.findById(userid, "username _id", (err, doc) => {
    if (err) {
      res.json({error: "UserId does not exist."});
      return console.log(err);
    } else {
      return doc;
    }
  });
  if (!date) {
    var today = new Date();
    date = today;
  } else {
    date = new Date(date);
    if (isNaN(date)) {
      console.log("Oops");
      return res.json({error: "Date string incorrect format"});
    }
  }
  var user = await User.findById(userid, (err, doc) => {
    if (err) return console.log(err);
    return doc;
  });
  var ex = new Exercise({userid: userid, description: description, duration: duration, date: date});
  await ex.save((err, doc) => {
    if (err) return console.log("Excercise didnt save");
  });
  var result = {username: user.username, description: description, duration: duration, _id: userid,  date: date.toDateString()};
  console.log("Returned: " + result);
  res.json(result);
});

app.get("/api/exercise/users", async (req, res) => {
  var users = await User.find({}, (err, data) => {
    if (err) return console.log(err);

    return data;
  });
  console.log(users);
  res.json(users);
});

app.get("/api/exercise/log", async (req, res) => {
  var userid = req.query.userId;
  var limit = parseInt(req.query.limit);
  var to = req.query.to;
  var from = req.query.from;
  var user = await User.findById(userid, "username _id", (err, doc) => {
    if (err || !doc) {
      res.json({error: "User not found."});
      return console.log(err);
    } else {
      return doc;
    }
  });
  
  var ex_q = Exercise.find({userid: userid}).select("description duration date");  
  if (to) {
    ex_q = ex_q.find({date: {$lte: to}});
  }
  if (from) {
    ex_q = ex_q.find({date: {$gte: from}});
  }
  if (limit) {
    ex_q = ex_q.limit(limit);
  }
  ex_q.exec((err, docs) => {
    if (err) {
      res.json({error: err});
      return console.log(err);
    } else {
      res.json({username: user.username, _id: userid, log: docs, count: docs.length});
      return docs;
    }
  });
});

app.post("/api/exercise/new-user/", async (req, res) => {
  var username = req.body.username;
  var user = new User({ username: username });
  await user.save((err, doc) => {
    if (err) {
      console.log("oops");
      res.json({ error: "User did not save" });
      return console.log(err);
    }
  });
  var id = user._id;
  console.log(id);
  var response_obj = { username: username, _id: id };
  res.json(response_obj);
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
