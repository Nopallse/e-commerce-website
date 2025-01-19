const express = require('express');
const path = require('path');
const db = require('./config/database.js');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require("http");
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const dotenv = require('dotenv');
dotenv.config();

// Socket.io setup
app.set('io', io);

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (nim) => {
    console.log(`User with NIM ${nim} joined room`);
    socket.join(nim);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));
app.use('/preline', express.static(path.join(__dirname, 'node_modules/preline/dist')));
app.use('/sweet', express.static(path.join(__dirname, 'node_modules/sweetalert2/dist')));

app.set('view engine', 'ejs');

// Database connection test
const testDatabaseConnection = async () => {
    try {
        await db.authenticate();
        console.log('Koneksi database berhasil.');
    } catch (error) {
        console.error('Gagal terkoneksi ke database:', error);
    }
};

testDatabaseConnection();


const { verifyToken } = require('./middleware/authMiddleware.js'); // Import only verifyToken

// New combined role middleware
const checkRole = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    // Allow admin to access all routes
    if (req.user.role === 'admin') {
        return next();
    }
    // For user routes, check if user has user role
    if (req.user.role === 'user' && !req.path.startsWith('/admin')) {
        return next();
    }
    // If user tries to access admin routes
    if (req.user.role === 'user' && req.path.startsWith('/admin')) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    res.status(403).json({ message: 'Access denied.' });
};

// Routes setup with modified middleware
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', verifyToken, checkRole, require('./routes/admin'));
app.use('/', verifyToken, checkRole, require('./routes/user'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});