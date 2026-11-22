import createError, { HttpError } from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import router from './routes/docker.js'
import { identity, requireAdmin } from './middleware/identity.js';

import { startScalingWorker } from './workers/scalingWorker.js';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/api/health', function (req: Request, res: Response, _next: NextFunction) {
  res.status(200)
});

app.use('/api/docker', router, identity, requireAdmin);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {},
  });
});

// Background Worker
startScalingWorker()

export default app;
