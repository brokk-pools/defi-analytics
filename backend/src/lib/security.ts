import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  const IoRedis = require('ioredis');
  redisClient = new IoRedis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  redisClient?.on('error', (err: any) => {
    logger.error('Redis connection error:', err);
  });

  redisClient?.on('connect', () => {
    logger.info('Connected to Redis');
  });
}

const createRateLimitConfig = (windowMs: number, max: number, message: string) => {
  const config: any = {
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
  };

  if (redisClient) {
    config.store = {
      incr: async (key: string) => {
        try {
          const result = await redisClient!.incr(key);
          if (result === 1) {
            await redisClient!.expire(key, Math.ceil(windowMs / 1000));
          }
          return { totalHits: result, resetTime: new Date(Date.now() + windowMs) };
        } catch (error) {
          logger.error('Redis rate limit error:', error);
          return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
        }
      },
      decrement: async (key: string) => {
        try {
          await redisClient!.decr(key);
        } catch (error) {
          logger.error('Redis decrement error:', error);
        }
      },
      resetKey: async (key: string) => {
        try {
          await redisClient!.del(key);
        } catch (error) {
          logger.error('Redis reset error:', error);
        }
      }
    };
  }

  return rateLimit(config);
};

export const generalRateLimit = createRateLimitConfig(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests
  'Too many requests from this IP, please try again later.'
);

export const webhookRateLimit = createRateLimitConfig(
  parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests
  'Too many webhook requests, please slow down.'
);

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://mainnet.helius-rpc.com", "https://api.mainnet-beta.solana.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : 
    (process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      ['http://localhost', 'http://localhost:3000', 'http://localhost:5173']),
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
});

export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.COOKIE_SAME_SITE as any || 'strict'
  },
  name: 'orca.sid',
});

export const trustProxyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.TRUST_PROXY === 'true') {
    req.app.set('trust proxy', true);
  }
  next();
};

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      size: res.get('Content-Length')
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Error Response', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

export const webhookSignatureMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/webhook/') && process.env.WEBHOOK_SECRET) {
    const signature = req.get('X-Webhook-Signature') || req.get('X-Hub-Signature-256');
    
    if (!signature) {
      logger.warn('Webhook request without signature', {
        ip: req.ip,
        path: req.path,
        headers: req.headers
      });
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    logger.info('Webhook signature validation would happen here', {
      hasSignature: !!signature,
      path: req.path
    });
  }
  
  next();
};