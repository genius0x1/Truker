const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("././../controllers/categoryControllers");
const {restrictTo,protect} = require("../controllers/authControllers");
const upload = require("../utils/multer");

const router = require("express").Router();

router
  .route("/")
  .post(protect, restrictTo("admin"),upload.single("image"), createCategory)
  .get(getCategories);
router
  .route("/:id")
  .get(getCategory)
  .patch(protect, restrictTo("admin"), updateCategory)
  .delete(protect, restrictTo("admin"), deleteCategory);

module.exports = router;
