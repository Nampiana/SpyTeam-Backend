import APIFeatures from "../utils/apiFeatures.js";
import catchAsync from "../utils/catchAsync.js";

const getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let queryObj = { ...req.query };
    Object.keys(queryObj).forEach((key) => {
      if (!isNaN(queryObj[key])) {
        queryObj[key] = parseFloat(queryObj[key]);
      } else if (typeof queryObj[key] === "string") {
        queryObj[key] = { $regex: queryObj[key], $options: "i" };
      }
    });

    let query = Model.find(queryObj);
    if (popOptions) {
      query = query.populate(popOptions);
    }

    let features = new APIFeatures(query, req.query)
      .sort()
      .limitFields()
      .paginate();

    let docs = [];
    try {
      docs = await features.query.lean({ virtuals: true });
    } catch (err) {
      console.log(err);
      return next(
        new AppError(
          "Une erreur s'est produite lors de la récupération des données",
          500
        )
      );
    }

    docs = docs || [];

    res.status(200).json({
      status: "success",
      results: docs.length,
      data: docs,
    });
  });

const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: doc.toJSON({ virtuals: true }),
    });
  });

const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: "success",
      data: doc.toJSON({ virtuals: true }),
    });
  });

const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: "success",
      data: doc.toJSON({ virtuals: true }),
    });
  });

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    res.status(200).json({
      status: "success",
      data: doc.toJSON({ virtuals: true }),
    });
  });

  const deleteAll = (Model) =>
    catchAsync(async (req, res, next) => {
      await Model.deleteMany({}); // Supprime tous les documents
  
      res.status(200).json({
        status: "success",
        message: "All documents have been deleted",
      });
    });
  

export default {
  getAll,
  getOne,
  createOne,
  updateOne,
  deleteOne,
  deleteAll
};
