const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const db = require("../config/database.js");

class Product extends Sequelize.Model {
  static associate(models) {
    Product.hasMany(models.CartItem);
    Product.hasMany(models.OrderItem);
  }
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    image: DataTypes.STRING,
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "Product",
    timestamps: true,
  }
);

module.exports = Product;
