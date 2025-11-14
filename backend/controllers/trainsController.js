const db = require('../config/db');

class TrainsController {
  async list(req, res) {
    try {
      const col = db.getTrainDetailsCollection();
      const docs = await col.find({}).project({ Train_No: 1, Train_Name: 1, Sleeper_Coaches_Count: 1, Three_TierAC_Coaches_Count: 1 }).sort({ Train_No: 1 }).toArray();
      const items = docs.map(d => ({
        trainNo: d.Train_No,
        trainName: d.Train_Name,
        sleeperCount: d.Sleeper_Coaches_Count,
        threeAcCount: d.Three_TierAC_Coaches_Count
      }));
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TrainsController();