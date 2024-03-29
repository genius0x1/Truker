const truckModel = require("../models/truckModel.js");
const slugify = require("slugify");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require(`${__dirname}/../utils/apiFeaturs`);
const cloudinary = require("../utils/cloudinary");

// to add a new truck
exports.createTruck = catchAsync(async (req, res, next) => {
  if (!req.file.path) return next(new AppError("please choose photo", 404));
  const result = await cloudinary.uploader.upload(req.file.path, {
    tags: "equipments",
    folder: "truks/",
  });
  req.body.imageCover = result.secure_url;

  req.body.slug = slugify(req.body.name, req.body.imageCover);
  let truck = new truckModel(req.body);
  truck.service_providerId = req.user._id;
  await truck.save();
  !truck && next(new AppError(" not create truck", 400));
  truck && res.status(201).json(truck);
});
// to get all trucks

exports.getTrucks = catchAsync(async (req, res, next) => {
  let apiFeatures = new APIFeatures(truckModel.find(), req.query)
    // .paginate()
    .fields()
    .sort()
    .search()
    .filter();
  let trucks = await apiFeatures.mongooseQuery;
  const results = trucks.length;
  !trucks && next(new AppError("category not found", 400));
  trucks && res.status(200).json({ results, trucks });
});
// to get specific truck

exports.getTruck = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let truck = await truckModel.findById(id);
  !truck && next(new AppError("category not found", 400));
  req.session.data = truck;
  truck && res.status(200).json(truck);
});

// to update specific truck
exports.updateTruck = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!req.user.imageCover || req.file) {
    result = await cloudinary.uploader.upload(req.file.path, {
      tags: "equipments",
      folder: "truks/",
    });
    req.body.imageCover = result.secure_url;
  } else {
    req.body.imageCover = req.user.avatar;
  }
  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }

  let truck = await truckModel.findByIdAndUpdate(id, req.body, { new: true });
  !truck && next(new AppError("category not found", 400));
  truck && res.status(200).json(truck);
});
// to delete specific truck

exports.deleteTruck = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let truck = await truckModel.findByIdAndDelete(id);
  !truck && next(new AppError("category not found", 400));
  truck && res.status(200).json(truck);
});
