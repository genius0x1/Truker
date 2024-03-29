const Booking = require("../models/bookingModel.js");
const User = require("../models/userModel");
const Truck = require("../models/truckModel");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/appError");
const payment = require("../utils/payment.js");
const cloudinary = require(`${__dirname}/../utils/cloudinary.js`);
const twilio = require("./../utils/twilio");

const client = require("twilio")(twilio.accountSid, twilio.authToken);
const verifySid = twilio.verifySid;
exports.bookTicket = catchAsync(async (req, res, next) => {
  const service_provider = await User.findById(req.query.service_providerId);
  if (!service_provider) {
    return next(new appError("user has been deleted", 404));
  }
  const truck = await Truck.findById(req.query.truckId);
  if (!truck) return next(new appError("truck has been deleted", 404));
  if (service_provider.available === false) {
    return next(new appError("السائق غير متاح حاليا", 404));
  } else {
    const ticket = await Booking.create({
      service_providerId: req.query.service_providerId,
      customerId: req.user._id,
      truckId: req.query.truckId,
      price: req.body.price,
      description: req.body.description,
      paymentType: req.body.paymentType,
      startLocation: { coordinates: req.body.startLocation },
      deliveryLocation: { coordinates: req.body.deliveryLocation },
    });

    service_provider.currentTransactions.push(ticket);
    await service_provider.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { currentTransactions: ticket },
      },
      {
        new: true,
      }
    );
    res.status(201).json({
      status: "success",
      message:
        "تم ارسال الطلب الي السائق , عند قبول السائق للطلب سيظهر لك في الطلبات المقبولة برجاء متابعتها",
      ticket,
    });
  }
});
exports.confirmTicket = catchAsync(async (req, res, next) => {
  const service_provider = req.user;
  const ticket = await Booking.findById(req.query.ticket);
  if (!ticket) {
    return next(new appError("there was no ticket with this id ", 404));
  }
  const customerId = ticket.customerId;
  const customer = await User.findById(customerId);
  if (!customer) {
    return next(new appError("user has been deleted", 404));
  }
  if (req.body.booked === true && ticket.booked === false) {
    ticket.booked = true;

    service_provider.available = false;
    service_provider.acceptedTransactions.push(ticket);
    service_provider.currentTransactions.pop(ticket);

    //send code to customer
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: customer.phone,
        channel: "sms",
      });
    await ticket.save();
    customer.acceptedTransactions.push(ticket);
    customer.currentTransactions.pop(ticket);

    await service_provider.save({ validateBeforeSave: false });
    await customer.save({ validateBeforeSave: false });
    res.status(201).json({
      success: true,
      message: "تم قبول الطلب",
    });
  } else {
    service_provider.available = true;
    service_provider.currentTransactions.pop(ticket);
    customer.currentTransactions.pop(ticket);

    await service_provider.save({ validateBeforeSave: false });
    await customer.save({ validateBeforeSave: false });
    res.status(200).json({
      status: "success",
      message: "تم رفض الطلب",
    });
  }
});
exports.confirmProcess = catchAsync(async (req, res, next) => {
  const ticket = await Booking.findById(req.query.ticket);
  if (!ticket) {
    return next(new appError("there was no ticket with this id ", 404));
  }
  const service_providerId = ticket.service_providerId;
  const service_provider = await User.findById(service_providerId);
  if (!service_provider) {
    return next(new appError("user has been deleted", 404));
  }
  const customerId = ticket.customerId;
  const customer = await User.findById(customerId);
  if (!customer) {
    return next(new appError("user has been deleted", 404));
  }
  const code = req.body.code;
  const verification = await client.verify.v2
    .services(verifySid)
    .verificationChecks.create({ to: customer.phone, code: code });
  if (verification.valid == false) {
    return next(
      new appError("verfication failed please enter code again"),
      404
    );
  }
  if (verification.valid == true) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      tags: "verfiy",
      folder: "verfiy/",
    });
    ticket.image = result.secure_url;
    ticket.service_providerCode = true;
    service_provider.available = true;
    service_provider.doneTransactions.push(ticket);
    service_provider.acceptedTransactions.pop(ticket);
    customer.doneTransactions.push(ticket);
    customer.acceptedTransactions.pop(ticket);
    await ticket.save();
    await service_provider.save({ validateBeforeSave: false });
    await customer.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "تهانينا علي اكمالك المهمة بنجاح!",
    });
  }
});
exports.getAllbooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.find();
  results = booking.length;
  if (results == 0) return next(new appError("there was no equipments", 404));
  res.status(200).json({
    results,
    booking,
  });
});
exports.getTicket = catchAsync(async (req, res, next) => {
  const ticket = await Booking.findById(req.params.id);

  if (!ticket)
    return next(
      new appError(`there is no ticket with id ${req.params.id}`, 404)
    );

  res.status(200).json({
    ticket,
  });
});
exports.paymentTicket = catchAsync(async (req, res, next) => {
  const product = await Booking.findById(req.query.ticket);
  if (product.paymentType == "card") {
    const session = await payment({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: req.user.email,
      metadata: {
        productId: product._id.toString(),
      },
      cancel_url: `${
        process.env.CANCEL_URL
      }?productId=${product._id.toString()}`,
      line_items: [
        {
          price_data: {
            product_data: {
              name: Truck.name,
            },
            currency: "egp",
            unit_amount: product.price * 100,
          },
          quantity: "1",
        },
      ],
    });

    return res
      .status(200)
      .json({ message: "done", product, session, url: session.url });
  } else if (product.paymentType == "cash") {
    return res.status(200).json({ message: "done", product, success: true });
  }
});
