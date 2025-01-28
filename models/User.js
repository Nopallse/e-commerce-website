const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const db = require("../config/database.js");

class User extends Sequelize.Model {
  static associate(models) {
    User.hasMany(models.Order);
    User.hasMany(models.Cart);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "user"),
      defaultValue: "user",
    },
    fullName: DataTypes.STRING,
    addressDetail: DataTypes.TEXT, // Detail alamat
    village: DataTypes.STRING, // Desa/Kelurahan
    district: DataTypes.STRING, // Kecamatan
    city: DataTypes.STRING, // Kota/Kabupaten
    province: DataTypes.STRING, // Provinsi
    postalCode: DataTypes.STRING, // Kode Pos
    idPostalCode: DataTypes.STRING, // ID Kode Pos
    phone: DataTypes.STRING,
  },
  {
    sequelize: db,
    modelName: "User",
    timestamps: true,
  }
);

module.exports = User;
