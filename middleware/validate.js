const Joi = require('joi');

const validateTeaching = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow(''),
    url: Joi.string().uri().required(),
    thumbnail: Joi.string().uri().optional(),
    duration: Joi.string().optional(),
  });
  return schema.validate(data);
};

const validateUser = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(2).max(100).required(),
  });
  return schema.validate(data);
};

const validateAudio = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500),
    audioUrl: Joi.string().uri().required(),
    duration: Joi.string().optional(),
    thumbnail: Joi.string().uri().optional(),
  });
  return schema.validate(data);
};

module.exports = { validateTeaching, validateUser, validateAudio };