import express from 'express';
import { productRouter } from './product/routes';
import { inventoryRouter } from './inventory/routes';
import { orderRouter } from './order/routes';
import { httpErrorHandler } from './shared/httpErrorHandler';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(productRouter);
app.use(inventoryRouter);
app.use(orderRouter);
app.use(httpErrorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`order-lifecycle listening on http://localhost:${PORT}`);
});

export default app;
