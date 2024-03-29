const express = require("express");
const morgan = require("morgan");
const cors =require("cors");
const session = require('express-session');
const errControllers = require("./controllers/errControllers");

const AppError = require("./utils/appError");
const limiter = require("./utils/rateLimit");

const bookingRouter = require("./routes/bookingRoutes");

const userRouter = require("./routes/userRoutes");
const brandRouter = require("./routes/brandRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const favoriteListRouter = require("./routes/favoriteListRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const truckRouter = require("./routes/truckRoutes");

const helmet = require("helmet");
const mongo_sanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const app = express();
app.use(helmet());
app.set("view engine", "ejs");

app.use(morgan("dev"));

app.use(express.json());
app.use(mongo_sanitize());
app.use(xss());
app.use(hpp());

app.use(express.static(`${__dirname}/public`));
app.use(limiter.limiter);

app.use(cors()) 

app.use((req,res,next)=>
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next()
})
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use("/api/v1/users", userRouter);
app.use("/api/v1/brand", brandRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/favoriteList", favoriteListRouter);
app.use("/api/v1/truck", truckRouter);
app.use("/api/v1/booking", bookingRouter);
app.get("/", (req, res) => {
  res.render("index", { pageTitle: "Home" });
});

// handle unhandled routes
//firts goes to app error
app.all("*", (req, res, next) => {
  next(new AppError(`can't found ${req.originalUrl}`, 404)); // class inheritance
});

//then errControllers
app.use(errControllers);

module.exports = app;
