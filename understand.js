const Joi = require('joi');

const schema = Joi.object({
  email: Joi.string().email().required()
});

// Example validation
const { error, value } = schema.validate({ email: 'admin@hireengine.com' });
if (error) {
  console.log('Validation failed:', error.details[0].message);
} else {
  console.log('Valid email payload:', value);
}
