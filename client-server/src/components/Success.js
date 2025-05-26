import React from 'react';
import { Link } from 'react-router-dom';

const Success = () => (
  <div className="container">
    <h2>Payment Successful!</h2>
    <p>Your order has been placed.</p>
    <Link to="/"><button>Go to Homepage</button></Link>
  </div>
);

export default Success;