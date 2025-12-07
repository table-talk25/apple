const Analytics = require('../models/Analytics');

class AnalyticsService {
  static async trackEvent(type, event, data = {}) {
    try {
      const analyticsEntry = new Analytics({
        type,
        event,
        userId: data.userId,
        mealId: data.mealId,
        data: data.additionalData,
        location: data.location
      });

      await analyticsEntry.save();
      console.log(`📊 Analytics tracked: ${type} - ${event}`);
    } catch (error) {
      console.error('❌ Analytics tracking error:', error);
    }
  }

  static async getDashboardStats(timeRange = 'week') {
    const now = new Date();
    let startDate;

    switch(timeRange) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const stats = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);

    return stats;
  }

  static async getGeoStats(centerPoint, radiusKm = 50) {
    const geoStats = await Analytics.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: centerPoint
          },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true
        }
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          avgDistance: { $avg: '$distance' }
        }
      }
    ]);

    return geoStats;
  }

  static async getUserActivity(userId, timeRange = 'week') {
    const now = new Date();
    let startDate;

    switch(timeRange) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const userStats = await Analytics.aggregate([
      { 
        $match: { 
          userId: userId,
          timestamp: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          lastActivity: 1
        }
      }
    ]);

    return userStats;
  }

  static async getMealAnalytics(mealId) {
    const mealStats = await Analytics.aggregate([
      { $match: { mealId: mealId } },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);

    return mealStats;
  }

  static async getPopularEvents(timeRange = 'week', limit = 10) {
    const now = new Date();
    let startDate;

    switch(timeRange) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const popularEvents = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return popularEvents;
  }
}

module.exports = AnalyticsService;
