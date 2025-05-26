import React, { useState } from 'react';
import axios from 'axios';

const AddProduct = () => {
  const [formData, setFormData] = useState({ name: '', description: '', price: '' });
  const [image, setImage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    if (image) {
      data.append('image', image);
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/products`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Product added successfully');
      setFormData({ name: '', description: '', price: '' });
      setImage(null);
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product');
    }
  };

  return (
    <div className="container">
      <h2>Add Product</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </div> 
        <div>
          <label>Description:</label>
          <textarea name="description" value={formData.description} onChange={handleChange} />
        </div>
        <div>
          <label>Product Price:</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} required />
        </div>
        <div>
          <label>Product Image:</label>
          <input type="file" name="image" accept="image/*" onChange={handleFileChange} />
        </div>
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
};

export default AddProduct;