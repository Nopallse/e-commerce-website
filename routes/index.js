const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { User } = require('../models');


router.get('/',verifyToken ,async (req, res) => {
  const isLoggedIn = req.user ? true : false; // Periksa apakah user ada di request
  
  const user = await User.findOne({ where: { id: req.user.id } });
  console.log(user);
  res.render('user/home', {
    isLoggedIn,
    user,
  });
});


router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});


module.exports = router;
