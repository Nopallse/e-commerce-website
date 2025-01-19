const User = require("../models/User");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");

const userController = {
  // Get user dashboard page
  getDashboard: async (req, res) => {
    try {
      const userId = req.user.id
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.redirect('/login');
      }
      
      res.render('user/profile', {
        user,
        title: 'Dashboard'
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  },

  // Get user orders
  getOrders: async (req, res) => {
    try {
      const userId = req.session.userId;
      const orders = await Order.findAll({
        where: { userId },
        include: [
          {
            model: OrderItem,
            include: [Product]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.render('user/pesanan', {
        orders,
        title: 'Pesanan Saya'
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.session.userId;
      const { fullName, phone } = req.body;

      await User.update(
        { fullName, phone },
        { where: { id: userId } }
      );

      req.flash('success', 'Profil berhasil diperbarui');
      res.redirect('/my-account');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Gagal memperbarui profil');
      res.redirect('/my-account');
    }
  },

  updateAddress: async (req, res) => {
    try {
      const userId = req.user.id; 
      const { address } = req.body;
  
      // Validasi keberadaan pengguna
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Perbarui data alamat pada tabel User
      await user.update({
        addressDetail: address.detail,
        village: address.village,
        district: address.district,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
      });
  
      return res.status(200).json({ message: 'Alamat berhasil diperbarui' });
    } catch (error) {
      console.error('Error updating address:', error);
      return res.status(500).json({ message: 'Gagal memperbarui alamat' });
    }
  },
  
      


  // Change password
  changePassword: async (req, res) => {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        req.flash('error', 'User tidak ditemukan');
        return res.redirect('/my-account');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        req.flash('error', 'Password saat ini tidak sesuai');
        return res.redirect('/my-account');
      }

      // Verify new password match
      if (newPassword !== confirmPassword) {
        req.flash('error', 'Password baru tidak cocok');
        return res.redirect('/my-account');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      req.flash('success', 'Password berhasil diubah');
      res.redirect('/my-account');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Gagal mengubah password');
      res.redirect('/my-account');
    }
  }
};

module.exports = userController;