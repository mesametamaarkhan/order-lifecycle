import { Router } from "express";
import { AppError } from "../shared/errors";
import * as productRepo from './repository';

export const productRouter = Router();

productRouter.get('/products', (req, res) => {
    res.json({ products: productRepo.findAll() });
});

productRouter.get('/products/:id', (req, res) => {
    const product = productRepo.findById(req.params.id);
    if(!product) {
        throw new AppError('PRODUCT_NOT_FOUND', `Product ${req.params.id} not found.`);
    }

    res.json({ product });
})