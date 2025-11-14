// backend/middleware/validation.js

const ValidationService = require('../services/ValidationService');

class ValidationMiddleware {
  /**
   * Validate train initialization request
   */
  validateTrainInit(req, res, next) {
    const { trainNo, journeyDate } = req.body;

    if (trainNo && !/^\d{5}$/.test(trainNo)) {
      return res.status(400).json({
        success: false,
        message: 'Train number must be 5 digits'
      });
    }

    if (journeyDate && !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
      return res.status(400).json({
        success: false,
        message: 'Journey date must be in YYYY-MM-DD format'
      });
    }

    next();
  }

  /**
   * Validate PNR in request
   */
  validatePNR(req, res, next) {
    const pnr = req.body.pnr || req.params.pnr;

    if (!pnr) {
      return res.status(400).json({
        success: false,
        message: 'PNR is required'
      });
    }

    const validation = ValidationService.validatePNR(pnr);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    next();
  }

  /**
   * Validate reallocation request
   */
  validateReallocation(req, res, next) {
    const { allocations } = req.body;

    if (!allocations || !Array.isArray(allocations)) {
      return res.status(400).json({
        success: false,
        message: 'Allocations array is required'
      });
    }

    if (allocations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one allocation is required'
      });
    }

    // Validate each allocation
    for (let allocation of allocations) {
      if (!allocation.coach || !allocation.berth || !allocation.pnr) {
        return res.status(400).json({
          success: false,
          message: 'Each allocation must have coach, berth, and pnr'
        });
      }
    }

    next();
  }

  /**
   * Check if train is initialized
   */
  checkTrainInitialized(req, res, next) {
    const trainController = require('../controllers/trainController');
    const trainState = trainController.getGlobalTrainState();

    if (!trainState) {
      return res.status(400).json({
        success: false,
        message: 'Train is not initialized. Please initialize the train first.'
      });
    }

    next();
  }

  /**
   * Check if journey has started
   */
  checkJourneyStarted(req, res, next) {
    const trainController = require('../controllers/trainController');
    const trainState = trainController.getGlobalTrainState();

    if (!trainState) {
      return res.status(400).json({
        success: false,
        message: 'Train is not initialized'
      });
    }

    if (!trainState.journeyStarted) {
      return res.status(400).json({
        success: false,
        message: 'Journey has not started. Please start the journey first.'
      });
    }

    next();
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(req, res, next) {
    const { page, limit } = req.query;

    if (page && (isNaN(page) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    next();
  }

  validatePassengerAdd(req, res, next) {
    const { pnr, age, seat_no, from, to } = req.body;
    if (pnr && !/^\d{10}$/.test(pnr)) {
      return res.status(400).json({ success: false, message: 'PNR must be 10 digits' });
    }
    if (age && (isNaN(age) || age < 1 || age > 120)) {
      return res.status(400).json({ success: false, message: 'Age must be 1-120' });
    }
    if (seat_no && (isNaN(seat_no) || seat_no < 1 || seat_no > 72)) {
      return res.status(400).json({ success: false, message: 'Seat no must be 1-72' });
    }
    // Simple from < to check (full in controller)
    if (from && to && from === to) {
      return res.status(400).json({ success: false, message: 'To station must be after From' });
    }
    next();
  }

  /**
   * Sanitize request body
   */
  sanitizeBody(req, res, next) {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    next();
  }

  /**
   * Validate dynamic configuration payload from frontend
   */
  validateDynamicConfig(req, res, next) {
    const {
      mongoUri,
      stationsDb,
      stationsCollection,
      passengersDb,
      passengersCollection,
      trainDetailsDb,
      trainDetailsCollection,
      trainNo,
      journeyDate
    } = req.body;

    // Allow "same database" behavior: if passengersDb is missing, default it to stationsDb
    // This mirrors the frontend checkbox intent and avoids forcing duplicate input.
    const effectivePassengersDb = passengersDb || stationsDb;
    req.body.passengersDb = effectivePassengersDb;
    // Default Train Details to stations DB and conventional collection name
    req.body.trainDetailsDb = trainDetailsDb || stationsDb;
    req.body.trainDetailsCollection = trainDetailsCollection || 'Trains_Details';

    if (!mongoUri || !stationsDb || !stationsCollection || !effectivePassengersDb || !passengersCollection) {
      return res.status(400).json({
        success: false,
        message: 'Mongo URI, databases, and collections are required'
      });
    }

    if (!trainNo || !/^[0-9]{5}$/.test(trainNo)) {
      return res.status(400).json({ success: false, message: 'Train number (5 digits) is required' });
    }

    // Train name is optional and not validated; use as-is from frontend

    if (!journeyDate || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
      return res.status(400).json({ success: false, message: 'Journey date must be YYYY-MM-DD' });
    }

    next();
  }
}

module.exports = new ValidationMiddleware();