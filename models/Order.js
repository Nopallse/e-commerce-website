const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const db = require("../config/database.js");

class Order extends Sequelize.Model {
  static associate(models) {
    Order.belongsTo(models.User);
    Order.hasMany(models.OrderItem);
  }
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    midtransOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "Belum Bayar",
        "Dikemas",
        "Dikirim",
        "Selesai",
        "Dibatalkan"
      ),
      defaultValue: "Belum Bayar",
    },
    shippingService: DataTypes.STRING,
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    resi: DataTypes.STRING,
    shippingAddress: DataTypes.TEXT,
  },
  {
    sequelize: db,
    modelName: "Order",
    timestamps: true,
  }
);

module.exports = Order;
