const express = require('express');
const supertest = require('supertest');
const Joi = require('joi');
const validate = require('../middlewares/validate.middleware');
const errorHandler = require('../middlewares/errorHandler.middleware');

describe('Validate Middleware & Non-hanging behavior', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const testSchema = {
      body: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
      }),
    };

    app.post('/test-endpoint', validate(testSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.use(errorHandler);
  });

  it('should call next() and return 200 OK when validation succeeds without hanging', async () => {
    const response = await supertest(app)
      .post('/test-endpoint')
      .send({ name: 'John Doe', email: 'john@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ name: 'John Doe', email: 'john@example.com' });
  });

  it('should return 400 Bad Request when validation fails', async () => {
    const response = await supertest(app)
      .post('/test-endpoint')
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
