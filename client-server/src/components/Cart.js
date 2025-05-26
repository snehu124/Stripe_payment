import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const customerId = localStorage.getItem('customerId');

  useEffect(() => {
    if (!customerId) {
      navigate('/');
      return;
    }
    axios.get(`${process.env.REACT_APP_API_URL}/api/cart/${customerId}`)
      .then(res => setCartItems(res.data?.items || []))
      .catch(err => {
        if (err.response?.status === 404) {
          setCartItems([]);
        } else {
          console.error('Error fetching cart:', err);
        }
      });
  }, [customerId, navigate]);

  const updateQuantity = async (productId, quantity) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/cart/update`, {
        customerId,
        productId,
        quantity,
      });
      setCartItems(response.data.items);
    } catch (err) {
      console.error('Error updating cart:', err);
      alert('Failed to update cart');
    }
  };

  const removeItem = async (productId) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/cart/update`, {
        customerId,
        productId,
        quantity: 0,
      });
      setCartItems(response.data.items);
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item');
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/create-checkout-session`, { customerId });
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Stripe Checkout Error:', err);
      const errorMessage = err.response?.data?.details || 'Error processing payment. Please try again.';
      alert(errorMessage);
    }
    setIsLoading(false);
  };

  return (
    <div className="container-fluid">
      <h2>Your Cart</h2>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cartItems
            .filter(item => item.productId)
            .map(item => (
              <div key={item.productId._id} className="product-card">
                {item.productId.image && (
                  <img src={item.productId.image} alt={item.productId.name} className="product-image" />
                )}
                <div className="product-details">
                  <h3>{item.productId.name}</h3>
                  <p>${item.productId.price} x {item.quantity}</p>
                  <button onClick={() => updateQuantity(item.productId._id, item.quantity + 1)}>+</button>
                  <button onClick={() => updateQuantity(item.productId._id, item.quantity - 1)}>-</button>
                  <button onClick={() => removeItem(item.productId._id)}>Remove</button>
                </div>
              </div>
            ))}
          {cartItems.every(item => !item.productId) && <p>No valid items in cart.</p>}
          <button onClick={handleCheckout} disabled={isLoading || cartItems.every(item => !item.productId)} className="buy-now-btn">
            {isLoading ? 'Processing...' : 'Checkout'}
          </button>
        </>
      )}
    </div>
  );
};

export default Cart;