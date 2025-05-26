import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const customerId = localStorage.getItem('customerId') || uuidv4();

  useEffect(() => {
    localStorage.setItem('customerId', customerId);
    axios.get(`${process.env.REACT_APP_API_URL}/api/products`)
      .then(res => setProducts(res.data))
      .catch(err => console.error('Error fetching products:', err));
    axios.get(`${process.env.REACT_APP_API_URL}/api/cart/${customerId}`)
      .then(res => setCartItems(res.data?.items || []))
      .catch(err => {
        if (err.response?.status === 404) {
          setCartItems([]);
        } else {
          console.error('Error fetching cart:', err);
        }
      });
  }, [customerId]);

  const addToCart = async (product) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/cart/add`, {
        customerId,
        productId: product._id,
        quantity: 1,
      });
      setCartItems(response.data.items);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart');
    }
  };

  return (
    <div className="container-fluid">
      <h2>Products</h2>
      <button onClick={() => navigate('/cart')} className="cart-num">
        Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
      </button>
      <button onClick={() => navigate('/add-product')} className="add-product-btn">
        Add Product
      </button>
      <div className="item-card">
        {products.map(product => (
          <div key={product._id} className="product-card">
            {product.image && <img src={product.image} alt={product.name} className="product-image" />}
            <div className="product-details">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p>${product.price}</p>
              <button onClick={() => addToCart(product)}>Add to Cart</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;