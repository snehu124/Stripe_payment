const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./database/config');
const Product = require('./models/products');
const Order = require('./models/order');
require('dotenv').config();
const Stripe = require('stripe');
const Cart = require('./models/cart');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Router = express.Router;
const multer = require('multer');
const path = require('path');
dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Serve static files (for images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Connect to MongoDB
connectDB();

// API to add a new product with image upload
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const image = req.file ? `${process.env.BACKEND_URL}/uploads/${req.file.filename}` : '';
    const product = new Product({ name, description, price, image });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get products with their orders
app.get('/api/products-with-orders', async (req, res) => {
  try {
    const products = await Product.find();
    const orders = await Order.find();
    const productsWithOrders = products.map(product => {
      const productOrders = orders.filter(order =>
        order.cartItems.some(item => item.productId === product._id.toString())
      );
      return {
        ...product._doc,
        orders: productOrders.map(order => ({
          orderId: order._id,
          customerId: order.customerId,
          payment_status: order.payment_status,
          totalAmount: order.totalAmount,
          orderedItems: order.cartItems.filter(item => item.productId === product._id.toString()),
          createdAt: order.createdAt,
        })),
      };
    });
    res.json(productsWithOrders);
  } catch (err) {
    console.error('Error fetching products with orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to add an item to the cart
app.post('/api/cart/add', async (req, res) => {
  try {
    const { customerId, productId, quantity } = req.body;
    if (!customerId || !productId || !quantity) {
      return res.status(400).json({ error: 'customerId, productId, and quantity are required' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      cart = new Cart({ customerId, items: [] });
    }
    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to update item quantity in the cart
app.post('/api/cart/update', async (req, res) => {
  try {
    const { customerId, productId, quantity } = req.body;
    if (!customerId || !productId) {
      return res.status(400).json({ error: 'customerId and productId are required' });
    }
    const cart = await Cart.findOne({ customerId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    cart.updatedAt = Date.now();
    await cart.save();
    if (cart.items.length > 0) {
      await cart.populate('items.productId');
      cart.items = cart.items.filter(item => item.productId);
      await cart.save();
    }
    res.json(cart);
  } catch (err) {
    console.error('Error updating cart:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update cart', details: err.message });
  }
});

// API to get the cart
app.get('/api/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart) {
      return res.json({ customerId, items: [] });
    }
    cart.items = cart.items.filter(item => item.productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to create Stripe checkout session (updated above)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }
    const cartData = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cartData) {
      return res.status(400).json({ error: 'Cart not found' });
    }
    const validItems = cartData.items.filter(item => {
      if (!item.productId) {
        console.warn(`Invalid item in cart ${customerId}: productId is null`);
        return false;
      }
      if (!item.productId.name || !item.productId.price) {
        console.warn(`Invalid item in cart ${customerId}: missing name or price for product ${item.productId._id}`);
        return false;
      }
      return true;
    });
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'No valid items in cart' });
    }
    cartData.items = validItems;
    await cartData.save();
    const customer = await stripe.customers.create({
      metadata: {
        cartItems: JSON.stringify(
          validItems.map(item => ({
            productId: item.productId._id.toString(),
            name: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
            image: item.productId.image || '',
          }))
        ),
      },
    });
    const line_items = validItems.map(item => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productId.name,
            description: item.productId.description || '',
            images: item.productId.image ? [item.productId.image] : [],
          },
          unit_amount: Math.round(Number(item.productId.price) * 100),
        },
        quantity: item.quantity,
      };
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer: customer.id,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create checkout session', details: err.message });
  }
});

// API to get payment details
app.get('/api/payment-details/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const orders = await Order.find({ customerId });
    if (!orders.length) {
      return res.status(404).json({ error: 'No orders found for this customer' });
    }
    const paymentDetails = await Promise.all(
      orders.map(async order => {
        if (!order.payment_intent) {
          return {
            orderId: order._id,
            customerId: order.customerId,
            totalAmount: order.totalAmount,
            payment_status: order.payment_status,
            paymentDetails: null,
          };
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent);
        return {
          orderId: order._id,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          payment_status: order.payment_status,
          paymentDetails: {
            id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            created: new Date(paymentIntent.created * 1000),
            payment_method: paymentIntent.payment_method,
            last4: paymentIntent.charges.data[0]?.payment_method_details?.card?.last4 || 'N/A',
          },
        };
      })
    );
    res.json(paymentDetails);
  } catch (err) {
    console.error('Error fetching payment details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook to handle successful payment
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err.message}`);
    return res.sendStatus(400);
  }
  if (event.type === 'checkout.session.completed') {
    const data = event.data.object;
    try {
      const customer = await stripe.customers.retrieve(data.customer);
      const cartItems = JSON.parse(customer.metadata.cartItems);
      const updatedCartItems = await Promise.all(
        cartItems.map(async item => {
          const product = await Product.findOne({ name: item.name });
          return { ...item, productId: product ? product._id : null };
        })
      );
      const newOrder = new Order({
        customerId: customer.id,
        cartItems: updatedCartItems,
        payment_status: data.payment_status,
        payment_intent: data.payment_intent,
        totalAmount: data.amount_total / 100,
      });
      await newOrder.save();
      await Cart.deleteOne({ customerId: customer.id });
    } catch (err) {
      console.error('Error processing webhook:', err);
    }
  }
  res.status(200).end();
});

app.listen(5000, () => console.log('Server running on port 5000'));