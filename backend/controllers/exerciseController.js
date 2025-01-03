const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/exercises/");
  },
  filename: (req, file, cb) => {
    if (!req.body.slug) {
      return cb(new Error("Slug is required in the request body"));
    }
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.body.slug}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed!"));
  },
});

const getExercises = asyncHandler(async (req, res) => {
  try {
    const exercises = await prisma.exercise.findMany();

    if (!exercises || exercises.length === 0) {
      return res
          .status(404)
          .json({ success: false, message: "No exercises found" });
    }

    res.status(200).json({ success: true, data: { exercises } });
  } catch (error) {
    res
        .status(500)
        .json({ success: false, message: "Server error", error: error.message });
  }
});

const getExercise = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const exercise = await prisma.exercise.findUnique({
      where: {
        id,
      },
    });
    if (!exercise) {
      return res
          .status(404)
          .json({ success: false, message: "Exercise not found" });
    }
    res.status(200).json({ success: true, data: { exercise } });
  } catch (error) {
    res
        .status(500)
        .json({ success: false, message: "Server error", error: error.message });
  }
});

const createExercise = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    description,
    reps,
    sets,
    duration,
    videoUrl,
    focusArea,
    equipments,
  } = req.body;
  try {
    const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const slugWithExtension = `${formattedSlug}${fileExtension}`;
    const parsedEquipments = equipments ? JSON.parse(equipments) : [];
    const newExercise = await prisma.exercise.create({
      data: {
        name,
        slug: slugWithExtension,
        description,
        reps: reps ? parseInt(reps) : null,
        sets: sets ? parseInt(sets) : null,
        duration: parseInt(duration),
        videoUrl,
        focusArea,
        equipments: {
          create:
              parsedEquipments?.map((equipment) => ({
                name: equipment.name,
              })) || [],
        },
      },
    });
    return res.status(201).json({
      success: true,
      message: "Exercise created successfully",
      data: newExercise,
    });
  } catch (error) {
    console.error("Error creating exercise:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the exercise.",
      error: error.message,
    });
  }
});

const updateExercise = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    reps,
    sets,
    duration,
    videoUrl,
    focusArea,
    equipments,
  } = req.body;

  try {
    const ExerciseExists = await prisma.Exercise.findUnique({
      where: { id },
    });

    if (!ExerciseExists) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description) updateData.description = description;
    if (reps) updateData.reps = reps;
    if (sets) updateData.sets = sets;
    if (duration) updateData.duration = duration;
    if (videoUrl) updateData.videoUrl = videoUrl;
    if (focusArea) updateData.focusA = focusArea;
    if (equipments) updateData.equipments = equipments;

    const updatedExercise = await prisma.exercise.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Exercise updated successfully",
      data: updatedExercise,
    });
  } catch (error) {
    console.error("Error updating Exercise:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the Exercise.",
      error: error.message,
    });
  }
});

const deleteExercise = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const exerciseExists = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exerciseExists) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }
    const deletedExercise = await prisma.exercise.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Exercise deleted successfully",
      data: deletedExercise,
    });
  } catch (error) {
    console.error("Error deleting exercise:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the exercise.",
      error: error.message,
    });
  }
});

module.exports = {
  upload,
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
};
