const Sequelize = require('sequelize');

const db = new Sequelize('kilang_tebu','root','',{
    host:"localhost",
    dialect:"mysql",
    logging: false 

});

module.exports = db; 
