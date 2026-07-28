import { Router } from 'express';
import * as orderService from './service';
import * as orderRepo from './repository';

export const orderRouter = Router();

orderRouter.post('/orders', (req, res) => {
    const { idempotency_key, items } = req.body;

    // check before placing order
    const wasExisting = !!idempotency_key && !!orderRepo.findByIdempotencyKey(idempotency_key);

    const order = orderService.placeOrder(idempotency_key, items);

    if (wasExisting) {
        res.status(200).json({ order });
    } else if (order.status === 'CONFIRMED') {
        res.status(201).json({ order });
    } else {
        res.status(422).json({ order });
    }
});

orderRouter.get('/orders/:id', (req, res) => {
    res.json({ order: orderService.getOrder(req.params.id) });
});
