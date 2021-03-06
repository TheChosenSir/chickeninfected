const express = require('express'),
  socket = require('socket.io'),
  mysql = require('mysql'),
  cookieParser = require('cookie-parser'),
  session = require('express-session');

//App setup
var app = express();
var server = app.listen(82, function () {
  console.log("listening to port 82.");
});
var io = socket(server);

var sessionMiddleware = session({
  secret: "keyboard cat"
});

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);
app.use(cookieParser());

// database connection setup
const config = {
  "host": "localhost",
  "user": "root",
  "password": "",
  "database": "login"
};

var db = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database
});
// the table used is named users
// it has columns id (auto increment) as primary key, username and password
db.connect(function (error) {
  if (!!error)
  throw error;

  console.log('mysql connected to ' + config.host + ", user " + config.user + ", database " + config.base);
});

app.use(express.static('./'));


io.on('connection', function (socket) {
  var req = socket.request;
  socket.on("login_register", function(data){
    const user = data.user,
    pass = data.pass;
    //searching if user info already present
    db.query("SELECT * FROM users WHERE username=?", [user], function(err, rows, fields){
    if(rows.length == 0){
        // if not present, adding it in
        db.query("INSERT INTO users(`username`, `password`) VALUES(?, ?)", [user, pass], function(err, result){
            if(!!err)
            throw err;

            console.log(result);
            socket.emit("logged_in", {user: user});
          });
    }else{
      // if present, logging in
      if(req.session.userID != null){
        db.query("SELECT * FROM users WHERE id=?", [req.session.userID], function(err, rows, fields){
        socket.emit("logged_in", {user: rows[0].username});
        });
      }
      const dataUser = rows[0].username,
        dataPass = rows[0].password;
      if(dataPass == null || dataUser == null){
        socket.emit("error");
      }
      if(user == dataUser && pass == dataPass){
        socket.emit("logged_in", {user: user});
        req.session.userID = rows[0].id;
        req.session.save();
      }else{
        socket.emit("invalid");
      }
    }
    });

  });
  
});

