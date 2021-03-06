var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var mysql = require('mysql')
const favicon = require('express-favicon');


//Security/Validation packages
var jsesc = require('jsesc');
var bcrypt = require('bcryptjs');
var validator = require('validator');
var sqlstring = require('sqlstring');

//External Routes

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'favicon.png')));
app.use(session({
  secret: 'kkwurhglkhwrglkwregb',
  resave: false,
  saveUninitialized: true,

}))
app.use(function(req, res, next) { //Add Session vars to be used in ejs files
  res.locals.username = req.session.username;
  res.locals.access = req.session.access;
  res.locals.amount1 = req.session.amount1;
  res.locals.amount2 = req.session.amount2;
  res.locals.amount3 = req.session.amount3;
  res.locals.amount4 = req.session.amount4;
  res.locals.amount5 = req.session.amount5;
  res.locals.totalPrice = req.session.totalPrice;
  next();
});
var connection = mysql.createConnection({
      host     : 'localhost',
      user     : 'root',
      password : '',
      database : 'project'
    });



app.all('/logout', function(req, res){
    req.session.destroy();
    res.redirect('/');
})

app.get('/login', function(req, res){
  if(req.session.access == 2)
  {
    res.redirect('/manager')
  }else if(req.session.access == 1)
  {
    res.redirect('/chef');
  }else if(req.session.access == 0)
  {
    res.redirect('/sales')
  }else{
    res.redirect('/');
  }
});


app.post('/login', function(req, res)
{
  var username = jsesc(req.body.username);
  var password = jsesc(req.body.password);
  console.log(username.length + ' ' +password.length)

  //Validate login strings

  if(username.length >= 3 && username.length <= 24   &&   password.length >= 3 && password.length <= 24 )
  {
    console.log("Input is ok")
  }else{
    console.log("Input is not ok")
    res.render('index.ejs', {info: "Username or password is too long or too short! (3-24 characters)"})
    res.end()
  }
  req.session.username = username;

//Validate


  var sql = "SELECT * FROM users WHERE username = " + sqlstring.escape(username) +"";
  var query = connection.query(sql, function (error, results, fields){
    if (error) throw(error);

    try{
      var hash = results[0].password;

      bcrypt.compare(password, hash, function(err, result) {
        console.log("Pass: " +password);
        console.log("Hash: " + hash);
          if(result===true){
            console.log("Same");

            if(results[0].access == 2)
            {
              console.log("Logging in " +username+ " as manager")
              req.session.access = 2;
              res.redirect('/manager');
            }
            if(results[0].access == 1)
            {
              console.log("Logging in " +username+ " as chef")
              req.session.access = 1;
              res.redirect('/chef');
            }
            if(results[0].access == 0)
            {
              console.log("Logging in " +username+ " as sales")
              req.session.access = 0;
              res.redirect('/sales');
            }

          }else{
            console.log("Not same");

            res.render('index.ejs', {info: "Invalid Login!"});
          }
      });

      console.log("Results " + results[0].access);



  }catch(e){console.log(e); console.log("Username or Password is incorrect"); res.render('index.ejs', {info: "Invalid Login"}); }
  });
  //connection.end();
  });

app.get('/sales', function(req, res)
  {
    console.log(req.session.access);
    if(req.session.access == 0)
    {
      res.render('sales.ejs');
    }else{
      res.redirect('/');
    }

  });

app.get('/chef', function(req, res)
  {
    console.log(req.session.access);
    if(req.session.access == 1)
    {
      //connection.connect();
      var sql = "SELECT stock FROM stock";
      var query = connection.query(sql, function(err, result)
      {
        if(err) throw err
        console.log("Data: " + result[0].stock);
        res.render('chef.ejs', {result});

      });
      //res.render("chef.ejs");
      //connection.end();

    }else{
      res.redirect('/');
    }
  });

app.get('/manager', function(req, res)
 {
   if(req.session.access == 2)
   {
     var popularDonuts;
     var sellerPerformance;
     var chefPerformance;


     var sql = "SELECT sum(`donut1-count`) as \"donut1\", sum(`donut2-count`)as \"donut2\", sum(`donut3-count`)as \"donut3\", sum(`donut4-count`)as \"donut4\", sum(`donut5-count`)as \"donut5\" FROM orders;"
     try
     {
       var query = connection.query(sql, function (error, results, fields)
       {
         if (error) throw(error);
         popularDonuts = results;

         console.log("popularDonuts: "+ JSON.stringify(popularDonuts[0]));

         var sql = "SELECT seller, cast(sum(totalPrice) as decimal(10,2)) as totalSold FROM orders GROUP BY seller ORDER BY totalSold DESC;";
         var query = connection.query(sql, function (error, results, fields)
         {
           if (error) throw(error);
           sellerPerformance = results;
           console.log("Seller Performance: "+ JSON.stringify(sellerPerformance));


            var sql ="SELECT chef, sum(totalDonuts) AS totalDonuts FROM stockupdates GROUP BY chef ORDER BY totalDonuts DESC;"
            var query = connection.query(sql, function (error, results, fields)
            {
              if (error) throw(error);
              chefPerformance = results;
              console.log("Chef Performance: "+ JSON.stringify(chefPerformance));
              res.render('manager.ejs', {popularDonuts: popularDonuts, sellerPerformance: sellerPerformance, chefPerformance: chefPerformance} );
           });
        });

       });





     }catch(e)
     {
       console.log(e);
       console.log("Error fetching data");
       res.render('index.ejs', {info: "Error fetching data"});
     }



  }else
  {
    res.redirect('/');
  }
});

app.get('/order', function(req, res)
  {
    if(req.session.access == 0){
      res.render('checkout.ejs')
    }else
    {
      res.render('index.ejs',{info: 'Incorrect permissions to view that page.'})
    }
  })

app.post('/order', function(req, res)
  {
    console.log(req.session);
    console.log("ACCESS LEVEL ===== " + req.session.access)
    //MAKE SURE ALL INPUTS ARE ACTUALLY NUMBERS
    if(isNaN(req.body.amount1) || isNaN(req.body.amount2) || isNaN(req.body.amount3) || isNaN(req.body.amount4) || isNaN(req.body.amount5))
    {
      //If any input is NaN, dont continue
      res.render('message.ejs', {message: 'You have tried to enter a non number value. This is not possible'})
      res.end();
      return;

    }
    req.session.amount1 = jsesc(req.body.amount1);
    req.session.amount2 = jsesc(req.body.amount2);
    req.session.amount3 = jsesc(req.body.amount3);
    req.session.amount4 = jsesc(req.body.amount4);
    req.session.amount5 = jsesc(req.body.amount5);

    console.log(req.session.amount1 + " is the session variable");
    var amount1 = jsesc(Number(req.body.amount1));
    var amount2 = jsesc(Number(req.body.amount2));
    var amount3 = jsesc(Number(req.body.amount3));
    var amount4 = jsesc(Number(req.body.amount4));
    var amount5 = jsesc(Number(req.body.amount5));
    var price1 = req.session.amount1*1.99;
    var price2 = req.session.amount2*2.49;
    var price3 = req.session.amount3*2.99;
    var price4 = req.session.amount4*3.49;
    var price5 = req.session.amount5*3.49;
    var totalPrice = price1+price2+price3+price4+price5;
    totalPrice = parseFloat(Math.round(totalPrice * 100) / 100).toFixed(2);

    req.session.totalPrice = totalPrice;
    console.log("Amount: " + req.session.amount1)
    console.log("Amount: " + req.session.amount2)
    console.log("Amount: " + req.session.amount3)
    console.log("Amount: " + req.session.amount4)
    console.log("Amount: " + req.session.amount5)
    console.log("Total: " + req.session.totalPrice)

    res.render('checkout.ejs', {amount1:amount1,amount2:amount2,amount3:amount3,amount4:amount4,amount5:amount5, totalPrice:totalPrice});
  });

app.post('/order/confirm', function(req, res)
  {
    var inStock = true;
    var stockValues;

    var username = req.session.username;
    var amount1 = Number(req.session.amount1);
    var amount2 = Number(req.session.amount2)
    var amount3 = Number(req.session.amount3)
    var amount4 = Number(req.session.amount4)
    var amount5 = Number(req.session.amount5)
    var totalPrice = Number(req.session.totalPrice)

    console.log("Confirming total price as: " +totalPrice);
    if(totalPrice <= 0)
    {
      res.render('message.ejs', {message: "We couldn't confirm that order because your cart was empty!"})
    }


    try{ //Reduce stock numbers
      var sql = "SELECT stock FROM stock";
      var query = connection.query(sql, function(err, result)
      {
        stockValues == result;
        console.log("Checking for stock...");
        if(amount1 > result[0].stock){inStock=false;}
        if(amount2 > result[1].stock){inStock=false;}
        if(amount3 > result[2].stock){inStock=false;}
        if(amount4 > result[3].stock){inStock=false;}
        if(amount5 > result[4].stock){inStock=false;}
      });
      setTimeout(function() {
        if(inStock == false){console.log("Out of stock"); res.render('message.ejs', {message: "We don't have enough stock :( "})}
        if(inStock == true)
        {
          try{ //Update stock values
            console.log("Updating stock...");
            var sql = "UPDATE stock SET stock = stock - "+ sqlstring.escape(amount1) +" WHERE id = 1";
            var query = connection.query(sql, function(err, results){if(err) throw (err) });
            var sql = "UPDATE stock SET stock = stock - "+ sqlstring.escape(amount2) +" WHERE id = 2";
            var query = connection.query(sql, function(err, results){if(err) throw (err) });
            var sql = "UPDATE stock SET stock = stock - "+ sqlstring.escape(amount3) +" WHERE id = 3";
            var query = connection.query(sql, function(err, results){if(err) throw (err) });
            var sql = "UPDATE stock SET stock = stock - "+ sqlstring.escape(amount4) +" WHERE id = 4";
            var query = connection.query(sql, function(err, results){if(err) throw (err) });
            var sql = "UPDATE stock SET stock = stock - "+ sqlstring.escape(amount5) +" WHERE id = 5";
            var query = connection.query(sql, function(err, results){if(err) throw (err) });

          }catch(e){
            console.log(e);
          }
        }
        if(inStock == true)
        {
          try{ //Add an order update to DB
            //connection.connect();
            var sql = "INSERT INTO `project`.`orders` (`seller`, `donut1-count`, `donut2-count`, `donut3-count`, `donut4-count`, `donut5-count`, `totalPrice`) VALUES ("+sqlstring.escape(username)+","+sqlstring.escape(amount1)+","+sqlstring.escape(amount2)+","+sqlstring.escape(amount3)+","+sqlstring.escape(amount4)+","+sqlstring.escape(amount5)+","+sqlstring.escape(totalPrice)+");"
            var query = connection.query(sql, function(err, result)
            {
              if(err) throw err
              console.log("Inserting data...");

            });

              res.render("confirmation.ejs");
            }catch(e){
                console.log(e);
            }
        }
        }, 250);
    }catch(e){
      console.log(e);
    }




  });

app.post('/stockupdate', function(req, res)
    {
      console.log("Donut update values");
      var don3 = Number(jsesc(req.body.donut3update));
      var don1 = Number(jsesc(req.body.donut1update));
      var don2 = Number(jsesc(req.body.donut2update));
      var don4 = Number(jsesc(req.body.donut4update));
      var don5 = Number(jsesc(req.body.donut5update));
      var totalDonuts = don1+don2+don3+don4+don5;

      //MAKE SURE ALL INPUTS ARE ACTUALLY NUMBERS
      if(isNaN(don1) || isNaN(don2) || isNaN(don3) || isNaN(don4) || isNaN(don5))
      {
        //If any input is NaN, dont continue
        res.render('message.ejs', {message: 'You have tried to enter a non number value. This is not possible'})
        res.end();
        return;
      }

      try{ //Log a stockupdate to DB
          //connection.connect();
          var sql = "INSERT INTO `project`.`stockupdates` (`chef`,`donut-1`, `donut-2`, `donut-3`, `donut-4`, `donut-5`, `totalDonuts`) VALUES ("+ "\"" +req.session.username+ "\"" + ',' +sqlstring.escape(don1)+ ',' +sqlstring.escape(don2)+',' +sqlstring.escape(don3)+ ',' +sqlstring.escape(don4)+ ',' +sqlstring.escape(don5)+ ',' +sqlstring.escape(totalDonuts)+ ");";
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          console.log("Updating stock: SQL: "+sql);

          var sql = "UPDATE stock SET stock = (stock + "+sqlstring.escape(don1)+") WHERE name = \"donut-1\";";
          console.log(sql);
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          var sql = "UPDATE stock SET stock = (stock + "+sqlstring.escape(don2)+") WHERE name = \"donut-2\";";
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          var sql = "UPDATE stock SET stock = (stock + "+sqlstring.escape(don3)+") WHERE name = \"donut-3\";";
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          var sql = "UPDATE stock SET stock = (stock + "+sqlstring.escape(don4)+") WHERE name = \"donut-4\";";
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          var sql = "UPDATE stock SET stock = (stock + "+sqlstring.escape(don5)+") WHERE name = \"donut-5\";";
          var query = connection.query(sql, function(err, result) {if(err) throw err});
          setTimeout(function() {
              res.redirect("/chef");
            }, 100);

          //connection.end();
      }catch(e){
          console.log(e);
      };
    });

  app.get('/stockupdate', function(req, res)
  {
    res.redirect('/chef');
  });

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, function()
{
  console.log("listening on port 3000!")
})
module.exports = app;
