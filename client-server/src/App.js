import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Products from './components/Products';
import Cart from './components/Cart';
import Success from './components/Success';
import Cancel from './components/Cancel';
import AddProduct from './components/addProducts';

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Products />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
      <Route path="/add-product" element={<AddProduct />} />
    </Routes>
  </Router>
);

export default App;