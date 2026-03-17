const User = require('../models/User');
const Service = require('../models/Service');
const Product = require('../models/Product');
const Course = require('../models/Course');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin user
    const existingAdmin = await User.findOne({ email: 'admin@galaxysalon.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@galaxysalon.com',
        password: 'admin123456',
        role: 'admin',
      });
      console.log('Admin user created (admin@galaxysalon.com / admin123456)');
    }

    // Seed Services
    const servicesData = [
      { serviceName: 'Haircut (Men)', duration: 30, price: 300, category: 'Hair' },
      { serviceName: 'Haircut (Women)', duration: 45, price: 500, category: 'Hair' },
      { serviceName: 'Hair Color', duration: 90, price: 1500, category: 'Hair' },
      { serviceName: 'Hair Spa', duration: 60, price: 800, category: 'Hair' },
      { serviceName: 'Keratin Treatment', duration: 180, price: 5000, category: 'Hair' },
      { serviceName: 'Basic Facial', duration: 45, price: 800, category: 'Facial' },
      { serviceName: 'Gold Facial', duration: 60, price: 1500, category: 'Facial' },
      { serviceName: 'Diamond Facial', duration: 75, price: 2500, category: 'Facial' },
      { serviceName: 'Cleanup', duration: 30, price: 500, category: 'Skin' },
      { serviceName: 'Bleach', duration: 30, price: 400, category: 'Skin' },
      { serviceName: 'Waxing (Full Arms)', duration: 30, price: 300, category: 'Skin' },
      { serviceName: 'Waxing (Full Legs)', duration: 40, price: 400, category: 'Skin' },
      { serviceName: 'Threading', duration: 15, price: 100, category: 'Skin' },
      { serviceName: 'Bridal Makeup', duration: 180, price: 15000, category: 'Makeup' },
      { serviceName: 'Party Makeup', duration: 90, price: 3000, category: 'Makeup' },
      { serviceName: 'Manicure', duration: 45, price: 500, category: 'Nail' },
      { serviceName: 'Pedicure', duration: 45, price: 600, category: 'Nail' },
      { serviceName: 'Nail Art', duration: 60, price: 800, category: 'Nail' },
      { serviceName: 'Head Massage', duration: 30, price: 300, category: 'Spa' },
      { serviceName: 'Full Body Massage', duration: 60, price: 2000, category: 'Spa' },
    ];

    const existingServices = await Service.countDocuments();
    if (existingServices === 0) {
      await Service.insertMany(servicesData);
      console.log('Services seeded');
    }

    // Seed Products
    const productsData = [
      { productName: 'L\'Oreal Shampoo 250ml', barcode: '8901526100101', price: 450, stock: 25, category: 'Shampoo', supplier: 'L\'Oreal India' },
      { productName: 'Dove Conditioner 180ml', barcode: '8901030715624', price: 320, stock: 20, category: 'Conditioner', supplier: 'HUL' },
      { productName: 'Matrix Hair Serum 100ml', barcode: '8901526200102', price: 550, stock: 15, category: 'Serum', supplier: 'Matrix' },
      { productName: 'Streax Hair Color', barcode: '8901526300103', price: 180, stock: 40, category: 'Color', supplier: 'Hygienic Research' },
      { productName: 'Lakme Sun Expert Cream', barcode: '8901526400104', price: 280, stock: 30, category: 'Cream', supplier: 'Lakme' },
      { productName: 'Set Wet Hair Gel', barcode: '8901526500105', price: 150, stock: 35, category: 'Gel', supplier: 'Paras' },
      { productName: 'Hair Dryer', barcode: '8901526600106', price: 1200, stock: 5, category: 'Tools', supplier: 'Philips' },
      { productName: 'Coconut Oil 200ml', barcode: '8901526700107', price: 180, stock: 50, category: 'Other', supplier: 'Parachute' },
    ];

    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0) {
      await Product.insertMany(productsData);
      console.log('Products seeded');
    }

    // Seed Employees
    const employeesData = [
      { name: 'Rajesh Kumar', role: 'Hair Stylist', phone: '9876543210', commissionRate: 10, salary: 20000 },
      { name: 'Priya Sharma', role: 'Beautician', phone: '9876543211', commissionRate: 12, salary: 22000 },
      { name: 'Deepa Menon', role: 'Nail Artist', phone: '9876543212', commissionRate: 10, salary: 18000 },
      { name: 'Suresh Ravi', role: 'Hair Stylist', phone: '9876543213', commissionRate: 10, salary: 20000 },
      { name: 'Meena Devi', role: 'Therapist', phone: '9876543214', commissionRate: 15, salary: 25000 },
    ];

    const existingEmployees = await Employee.countDocuments();
    if (existingEmployees === 0) {
      await Employee.insertMany(employeesData);
      console.log('Employees seeded');
    }

    // Seed Courses
    const coursesData = [
      { courseName: 'Hair Styling Professional', duration: '6 months', fee: 50000, description: 'Complete hair styling course', syllabus: ['Basic cuts', 'Advanced styling', 'Hair coloring', 'Treatments'] },
      { courseName: 'Makeup Artistry', duration: '4 months', fee: 40000, description: 'Professional makeup artist course', syllabus: ['Basic makeup', 'Bridal makeup', 'HD makeup', 'Air brush'] },
      { courseName: 'Nail Art & Extension', duration: '2 months', fee: 20000, description: 'Complete nail art course', syllabus: ['Basic nail art', 'Gel nails', 'Acrylic extension', 'Nail painting'] },
      { courseName: 'Skin Care & Facial', duration: '3 months', fee: 30000, description: 'Skincare specialist course', syllabus: ['Skin types', 'Facials', 'Chemical peels', 'Cleanup'] },
    ];

    const existingCourses = await Course.countDocuments();
    if (existingCourses === 0) {
      await Course.insertMany(coursesData);
      console.log('Courses seeded');
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedData();
