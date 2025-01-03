// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const {register, login, logout} = require('../controllers/auth');

router.post('/register', register);

router.post('/login', login);

router.get('/logout', logout);


module.exports = router;