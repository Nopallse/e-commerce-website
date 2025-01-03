const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const db = require("../config/database.js");

class Cart extends Sequelize.Model {
  static associate(models) {
    Cart.belongsTo(models.User);
    Cart.hasMany(models.CartItem);
  }
}

Cart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "Cart",
    timestamps: true,
  }
);

module.exports = Cart;
