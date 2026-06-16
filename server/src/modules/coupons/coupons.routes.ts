import { Router } from 'express';
import { UserRole } from '../../constants/index.js';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { requireRole } from '../../middlewares/requireRole.middleware.js';
import { createConfig, listIssuedCoupons, listMyCoupons } from './coupons.controller.js';

const couponsRouter = Router();

couponsRouter.use(requireAuth);

// user routes
couponsRouter.get('/my', listMyCoupons);

// admin routes
const adminOnly = requireRole(UserRole.ADMIN);
couponsRouter.post('/configurations', adminOnly, createConfig);
couponsRouter.get('/issued', adminOnly, listIssuedCoupons);

export default couponsRouter;
