import { Router } from 'express';
import * as inventoryService from './service';

export const inventoryRouter = Router();

inventoryRouter.get('/inventory/:product_id', (req, res) => {
    res.json({ inventory: inventoryService.getInventory(req.params.product_id) });
});

inventoryRouter.post('/inventory/:product_id/reserve', (req, res) => {
    const { order_id, quantity } = req.body;
    const reservation = inventoryService.reserve(req.params.product_id, quantity, order_id);
    res.status(201).json({ reservation });
});

inventoryRouter.post('/reservations/:id/confirm', (req, res) => {
    inventoryService.confirm(req.params.id);
    res.status(200).json({ status: 'CONFIRMED' });
});

inventoryRouter.post('/reservations/:id/release', (req, res) => {
    inventoryService.release(req.params.id);
    res.status(200).json({ status: 'RELEASED' });
});
