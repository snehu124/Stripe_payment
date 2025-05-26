import React from 'react';
import { Link } from 'react-router-dom';

const Cancel = () => (
  <div className="container">
    <h2>Payment Cancelled</h2>
    <p>Your payment was not processed.</p>
    <Link to="/"><button>Go to Homepage</button></Link>
  </div>
);

export default Cancel;