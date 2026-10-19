import express, { Request, Response, NextFunction } from 'express';
var router = express.Router();

/* GET home page. */
router.get('/health', function (req: Request, res: Response, next: NextFunction) {
  res.status(200)
});

export default router;
