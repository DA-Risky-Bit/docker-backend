import express, { Request, Response, NextFunction } from 'express';
import { createDockerRouter } from './docker/index';
var router = express.Router();

/* GET home page. */
router.get('/health', function (req: Request, res: Response, next: NextFunction) {
  res.status(200)
});

router.use('/api/docker', createDockerRouter());

export default router;
