const User = require("../models/userModel");
const Truck = require("../models/truckModel");
const catchAsync = require(`${__dirname}/../utils/catchAsync.js`);
const AppError = require(`${__dirname}/../utils/appError.js`);
const cloudinary = require(`${__dirname}/../utils/cloudinary.js`);
const axios = require("axios");

const filterObj = (obj, ...allowed) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getAllusers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  if (!users) return next(new AppError(`there is no users`, 404));
  res.status(200).json({
    users,
  });
});
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user)
    return next(new AppError(`there is no user with id ${req.params.id}`, 404));
  res.status(200).json({
    user,
  });
});
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data

  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError(`this route is not for password update !!!`, 404));
  }
  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filterBody = filterObj(req.body, "name", "email", "phone", "avatar");
  let result;

  if (!req.user.avatar || req.file) {
    result = await cloudinary.uploader.upload(req.file.path, {
      tags: "equipments",
      folder: "users/",
    });
    filterBody.avatar = result.secure_url;
  } else {
    filterBody.avatar = req.user.avatar;
  }
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: "success",
    updatedUser,
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role === "service_provider") {
    await Truck.deleteMany({ service_providerId: req.user._id });
  }
  await user.remove();
  res.status(204).json({
    status: "done",
  });
});

exports.getLicense = catchAsync(async (req, res, next) => {
  try {
    const axiosConfig = {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.subscriptionKey,
      },
    };
    const results = await cloudinary.uploader.upload(req.file.path, {
      tags: "liscences",
      folder: "liscences/",
    });
    imagePath = results.secure_url;
    const data = {
      url: imagePath,
    };
    const imageResult = await axios.post(
      process.env.endpoint,
      data,
      axiosConfig
    );
    const ocrResult = imageResult.data.readResult.content;

    res
      .status(200)
      .json({ status: "success", ocrResult, split: ocrResult.split("\n") });
  } catch (err) {
    console.log(err);
    res.status(500).send({ err });
  }
});
