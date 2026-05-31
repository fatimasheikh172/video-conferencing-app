/**
 * Health Check Endpoint
 * Provides system health status for monitoring and load balancers
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * GET /api/health
 * Returns health status of the application and its dependencies
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: 'healthy',
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Check MongoDB connection
    try {
      const dbState = mongoose.connection.readyState;
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      if (dbState === 1) {
        healthCheck.services.database = 'healthy';
        // Ping database to ensure it's responsive
        await mongoose.connection.db.admin().ping();
      } else {
        healthCheck.services.database = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.services.database = 'unhealthy';
      healthCheck.status = 'degraded';
      console.error('Database health check failed:', error.message);
    }

    // Check Redis connection (if Redis client is available)
    try {
      if (global.redisClient) {
        await global.redisClient.ping();
        healthCheck.services.redis = 'healthy';
      }
    } catch (error) {
      healthCheck.services.redis = 'unhealthy';
      healthCheck.status = 'degraded';
      console.error('Redis health check failed:', error.message);
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/ready
 * Readiness probe - checks if app is ready to accept traffic
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not connected',
      });
    }

    // App is ready
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message,
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe - checks if app is alive (for Kubernetes)
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
