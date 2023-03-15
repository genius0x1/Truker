const sendEmail = require("./email");
const catchAsync = require("./catchAsync");

exports.contactUS = catchAsync(async (req, res, next) => {
  await sendEmail({
    email: process.env.EMAIL_USERNAME,
    subject: `${req.body.email}`,
    message: `this is ${req.body.name},${req.body.message}`,
  });
  res.status(200).json({
    status: "success",
    message: "message sent successfully",
  });
});
