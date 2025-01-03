const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const db = require("../config/database.js");

class Category extends Sequelize.Model {
  static associate(models) {
    Category.hasMany(models.Product);
  }
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: DataTypes.TEXT,
  },
  {
    sequelize: db,
    modelName: "Category",
    timestamps: true,
  }
);

module.exports = Category;
