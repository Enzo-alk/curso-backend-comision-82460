import { Router } from 'express';
import fs from 'fs';

const cartsRouter = Router();
const CART_FILE_PATH = 'src/db/carrito.json';

// Función para leer carritos
async function readCarts() {
    try {
        const data = await fs.promises.readFile(CART_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Función para guardar carritos
async function writeCarts(carts) {
    try {
        await fs.promises.writeFile(CART_FILE_PATH, JSON.stringify(carts), 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
}

// Middleware para validar el contenido del carrito
function validateCart(req, res, next) {
    const cart = req.body;

    if (!Array.isArray(cart.products)) {
        return res.status(400).send({ status: 'error', message: 'Products field is required and must be an array' });
    }

    // Verificar IDs de productos
    if (cart.products.some(p => !Number.isInteger(p.id))) {
        return res.status(400).send({ status: 'error', message: 'All product IDs must be integers' });
    }

    // Asegurar cantidad por defecto y validarla
    cart.products.forEach(p => {
        if (typeof p.quantity !== 'number') p.quantity = 0;
    });
    if (cart.products.some(p => p.quantity < 0)) {
        return res.status(400).send({ status: 'error', message: 'All product quantities must be greater than 0' });
    }

    next();
}

// Obtener todos los carritos
cartsRouter.get('/', async (req, res) => {
    const carts = await readCarts();
    res.send({ status: 'success', carts });
});

// Obtener productos de un carrito por ID
cartsRouter.get('/:cid', async (req, res) => {
    const cid = parseInt(req.params.cid);
    const carts = await readCarts();
    const cart = carts.find(c => c.id === cid);

    if (!cart) {
        return res.status(404).send({ status: 'error', message: 'Cart not found' });
    }
    res.send({ status: 'success', products: cart.products });
});

// Crear un nuevo carrito
cartsRouter.post('/', validateCart, async (req, res) => {
    const carts = await readCarts();
    const newCart = {
        ...req.body,
        id: Date.now()
    };
    carts.push(newCart);

    const saved = await writeCarts(carts);
    if (!saved) {
        return res.status(500).send({ status: 'error', message: 'Could not add cart' });
    }
    res.status(201).send({ status: 'success', message: 'Cart added' });
});

// Agregar o actualizar producto en un carrito
cartsRouter.post('/:cid/product/:pid', async (req, res) => {
    const cid = parseInt(req.params.cid);
    const pid = parseInt(req.params.pid);

    if (!Number.isInteger(cid) || !Number.isInteger(pid)) {
        return res.status(400).send({ status: 'error', message: 'Cart ID and Product ID must be valid integers' });
    }

    const carts = await readCarts();
    const cart = carts.find(c => c.id === cid);
    if (!cart) {
        return res.status(404).send({ status: 'error', message: 'Cart not found' });
    }

    const qty = parseInt(req.body.quantity) || 1;
    if (isNaN(qty) || qty <= 0) {
        return res.status(400).send({ status: 'error', message: 'Quantity must be a number greater than 0' });
    }

    const productIndex = cart.products.findIndex(p => p.id === pid);
    if (productIndex < 0) {
        cart.products.push({ id: pid, quantity: qty });
    } else {
        cart.products[productIndex].quantity += qty;
    }

    const updated = await writeCarts(carts);
    if (!updated) {
        return res.status(500).send({ status: 'error', message: 'Could not update cart' });
    }

    res.send({ status: 'success', message: 'Product updated in cart' });
});

export default cartsRouter;
