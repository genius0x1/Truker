const { restrictTo, protect } = require("../controllers/authControllers");
const {
  createTruck,
  getTrucks,
  getTruck,
  updateTruck,
  deleteTruck,
} = require("./../controllers/truckControllers");

const router = require("express").Router();
const upload = require("../utils/multer");

router
  .route("/")
  .post(protect, restrictTo("admin", "service_provider"), upload.single("imageCover"),createTruck)
  .get(getTrucks);
router
  .route("/:id")
  .get(getTruck)
  .patch(protect, restrictTo("admin", "service_provider"), upload.single("imageCover"),updateTruck)
  .delete(protect, restrictTo("admin", "service_provider"), deleteTruck);

module.exports = router;
