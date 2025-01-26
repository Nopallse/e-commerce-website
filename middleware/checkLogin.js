const jwt = require('jsonwebtoken');
const { User, Cart, CartItem, Product } = require('../models');

const checkLogin = async (req, res, next) => {
  const token = req.cookies.token;
  
  // Set default values
  req.isLoggedIn = false;
  req.user = null;
  req.cartCount = 0;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return next();
    }

    const [cart] = await Cart.findOrCreate({
      where: { userId: user.id },
    });

    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          attributes: ["name", "price", "image"],
        },
      ],
    });

    req.isLoggedIn = true;
    req.user = user;
    req.cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { checkLogin };