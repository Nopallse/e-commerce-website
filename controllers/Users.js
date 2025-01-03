const Users = require("../models/UserModel.js");
const Mahasiswa = require("../models/MahasiswaModel.js");
const StatusPermintaan = require("../models/StatusPermintaanModel.js");
const Permintaan = require("../models/PermintaanModel.js");
const { getMahasiswa, getUser } = require("./auth.js");
const multer = require('multer');
const path = require('path');
const { check, validationResult } = require('express-validator');
const { encrypt } = require('./encryptionController'); 

const validateForm = [
  check('inputTarget').custom(value => {
    if (value === 'default') {
      throw new Error('Target permintaan surat harus dipilih');
    }
    return true;
  }),
  check('inputTujuan').custom(value => {
    if (value === 'default') {
      throw new Error('Tujuan permintaan surat harus dipilih');
    }
    return true;
  }),
  check('inputOrtu').if(check('inputTarget').equals('Orang tua')).notEmpty().withMessage('Nama orang tua harus diisi'),
  check('inputNip').if(check('inputTarget').equals('Orang tua')).notEmpty().withMessage('NIP harus diisi'),
  check('inputPangkat').if(check('inputTarget').equals('Orang tua')).notEmpty().withMessage('Pangkat dan golongan harus diisi'),
  check('inputUnit').if(check('inputTarget').equals('Orang tua')).notEmpty().withMessage('Unit kerja harus diisi'),
  check('inputInstansi').if(check('inputTarget').equals('Orang tua')).notEmpty().withMessage('Instansi induk harus diisi'),
  check('berkas').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('Berkas harus diupload');
    }
    if (req.file.size > 2 * 1024 * 1024) {
      throw new Error('Ukuran berkas maksimal 2 MB');
    }
    return true;
  })
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'data', 'permintaan'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


const formatDate = (date) => {
      const pad = (n) => (n < 10 ? '0' + n : n);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };
    const formattedDate = formatDate(new Date());
    
    
const sendForm = async (req, res) => {
  try {
    const { inputName, inputNim, inputDepartemen, inputTarget, inputTujuan, inputOrtu, inputNip, inputPangkat, inputUnit, inputInstansi } = req.body;
    const berkasFile = req.file ? req.file.filename : null;

    
    const permintaanBaru = await Permintaan.create({ 
      target: inputTarget,
      tujuan: inputTujuan,
      nim: inputNim,
      namaOrangtua: inputOrtu,
      nip: inputNip,
      pangkatGolongan: inputPangkat,
      unitKerja: inputUnit,
      instansiInduk: inputInstansi,
      status: "Diajukan",
      berkas: berkasFile  
    });
    
    const idPermintaan = permintaanBaru.idPermintaan; 
    console.log(idPermintaan);
    await StatusPermintaan.create({
      idStatus: "1",
      idPermintaan: idPermintaan,
      status: "Selesai",
      tanggal: formattedDate, 
    });

    await StatusPermintaan.create({
      idStatus: "2",
      idPermintaan: idPermintaan,
      status: "Sedang Berlangsung",
    });

    await StatusPermintaan.create({
      idStatus: "3",
      idPermintaan: idPermintaan,
      status: "Belum Diproses",
    });


    const href ="http://localhost:3000/admin/permintaan-unverified/" + idPermintaan;

    const io = req.app.get("io");
    io.to("1972020142000121001").emit("new_permintaan", {
      message: "Permintaan baru telah diajukan",
      permintaan: { isi: "oleh" + inputName + inputNim , href: href , tanggal: formattedDate }
    });

    return res.redirect('/riwayat');

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const getRiwayat = async (req, res) => {
  try {
    const mahasiswa = await getMahasiswa(req, res); 
    const user = await getUser(req, res); 

    const perPage = 10; 
    const page = req.query.page ? parseInt(req.query.page) : 1; 

    const totalEntries = await Permintaan.count(); 
    const totalPages = Math.ceil(totalEntries / perPage); 

    
    const permintaan = await Permintaan.findAll({
      where: { nim: mahasiswa.nim }, 
      offset: (page - 1) * perPage,
      limit: perPage
    });

    
    const permintaanWithMahasiswa = await Promise.all(permintaan.map(async (entry) => {
      const mahasiswa = await Mahasiswa.findOne({
        where: { nim: entry.nim },
        include: {
          model: Users,
          attributes: ['email']
        }
      });
      return {
        ...entry.toJSON(), 
        mahasiswa
      };
    }));

    res.render('user/riwayat', {
      user,
      permintaan: permintaanWithMahasiswa,
      currentPage: page,
      totalPages: totalPages,
      totalEntries: totalEntries,
      mahasiswa,
      page: 'riwayat'
    });
  } catch (error) {
    console.error("Error fetching permintaan:", error);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {};
