/**
 * Swagger API Documentation Configuration
 * Setup for Galaxy Salon System API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Galaxy Salon System API',
      version: '1.0.0',
      description: 'Complete API documentation for Galaxy Unisex Saloon & Beauty Academy billing system',
      contact: {
        name: 'Support',
        email: 'support@galaxysalon.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.galaxysalon.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
            code: { type: 'string', description: 'Error code' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            visitHistory: { type: 'array' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Bill: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            billNumber: { type: 'number' },
            customer: { type: 'string' },
            services: { type: 'array' },
            products: { type: 'array' },
            totalAmount: { type: 'number' },
            paymentMethod: { type: 'string', enum: ['cash', 'upi', 'card', 'split'] },
            status: { type: 'string', enum: ['completed', 'cancelled', 'refunded'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Service: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            serviceName: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            duration: { type: 'number', description: 'Duration in minutes' },
            isActive: { type: 'boolean' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            productName: { type: 'string' },
            barcode: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            stock: { type: 'number' },
            supplier: { type: 'string' },
            lowStockThreshold: { type: 'number' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
