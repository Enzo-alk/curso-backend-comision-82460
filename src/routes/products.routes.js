import { Router } from 'express';
import fs from 'fs';

const productsRouter = Router();
const DATA_FILE_PATH = 'src/db/products.json';

// Función para leer productos
async function readProducts() {
    try {
        const data = await fs.promises.readFile(DATA_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Función para guardar productos
async function writeProducts(products) {
    try {
        await fs.promises.writeFile(DATA_FILE_PATH, JSON.stringify(products), 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
}

// Middleware para validar datos del producto
function validateProductData(req, res, next) {
    const { title, description, code, price, status, stock, category } = req.body;
    if (![title, description, code, price, status, stock, category].every(Boolean)) {
        return res.status(400).send({ status: 'error', message: 'Missing required fields.' });
    }
    if (typeof title !== 'string' || typeof description !== 'string' || typeof code !== 'string' || typeof price !== 'number' ||
        typeof status !== 'boolean' || typeof stock !== 'number' || typeof category !== 'string' ||
        price < 0 || stock < 0) {
        return res.status(400).send({ status: 'error', message: 'Invalid or incorrect data types.' });
    }
    next();
}

// Obtener todos los productos o un número limitado
productsRouter.get('/', async (req, res) => {
    const products = await readProducts();
    const limit = parseInt(req.query.limit);
    const result = limit > 0 ? products.slice(0, limit) : products;
    res.send({ status: 'success', products: result });
});

// Obtener un producto por ID
productsRouter.get('/:pid', async (req, res) => {
    const products = await readProducts();
    const pid = parseInt(req.params.pid);
    const product = products.find(p => p.id === pid);
    if (!product) {
        return res.status(404).send({ status: 'error', message: 'Product not found' });
    }
    res.send({ status: 'success', product });
});

// crear un nuevo prodcto
productsRouter.post('/', validateProductData, async (req, res) => {
    const products = await readProducts();
    const newProduct = {
        ...req.body,
        id: Date.now(),
        status: req.body.status ?? true,
        thumbnails: Array.isArray(req.body.thumbnails) ? req.body.thumbnails : []
    };

    products.push(newProduct);
    const saved = await writeProducts(products);
    if (!saved) {
        return res.status(500).send({ status: 'error', message: 'Could not add product' });
    }
    res.status(201).send({ status: 'success', message: 'Product added' });
});

// actualiza un producto existente
productsRouter.put('/:pid', validateProductData, async (req, res) => {
    const products = await readProducts();
    const pid = parseInt(req.params.pid);
    const index = products.findIndex(p => p.id === pid);

    if (index < 0) {
        return res.status(404).send({ status: 'error', message: 'Product not found' });
    }

    products[index] = { ...req.body, id: pid };
    const updated = await writeProducts(products);
    if (!updated) {
        return res.status(500).send({ status: 'error', message: 'Could not update product' });
    }
    res.send({ status: 'success', message: 'Product updated' });
});

// Eliminar un producto
productsRouter.delete('/:pid', async (req, res) => {
    const products = await readProducts();
    const pid = parseInt(req.params.pid);
    const filtered = products.filter(p => p.id !== pid);

    if (filtered.length === products.length) {
        return res.status(404).send({ status: 'error', message: 'Product not found' });
    }

    const deleted = await writeProducts(filtered);
    if (!deleted) {
        return res.status(500).send({ status: 'error', message: 'Could not delete product' });
    }
    res.send({ status: 'success', message: 'Product deleted' });
});

export default productsRouter;
