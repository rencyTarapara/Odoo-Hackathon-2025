const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// In-memory data storage (replace with MongoDB in production)
let users = [];
let swapRequests = [];
let messages = [];
let notifications = [];

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Validation middleware
const validateUser = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes
app.post('/api/auth/register', validateUser, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, location } = req.body;

        // Check if user already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword,
            location: location || '',
            photo: '',
            skillsOffered: [],
            skillsWanted: [],
            availability: [],
            isPublic: true,
            rating: 0,
            totalSwaps: 0,
            role: 'user',
            createdAt: new Date().toISOString(),
            isBanned: false
        };

        users.push(newUser);

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userResponse } = newUser;

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.isBanned) {
            return res.status(403).json({ error: 'Account has been banned' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user;

        res.json({
            message: 'Login successful',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User routes
app.get('/api/users', authenticateToken, (req, res) => {
    try {
        const publicUsers = users
            .filter(user => user.isPublic && !user.isBanned && user.id !== req.user.id)
            .map(user => {
                const { password, ...userResponse } = user;
                return userResponse;
            });
        res.json(publicUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/users/:id', authenticateToken, (req, res) => {
    try {
        const user = users.find(u => u.id === parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password, ...userResponse } = user;
        res.json(userResponse);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/profile', authenticateToken, upload.single('photo'), (req, res) => {
    try {
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updateData = req.body;
        
        // Handle file upload
        if (req.file) {
            updateData.photo = `/uploads/${req.file.filename}`;
        }

        // Update user
        users[userIndex] = { ...users[userIndex], ...updateData };

        const { password, ...userResponse } = users[userIndex];
        res.json({
            message: 'Profile updated successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Swap requests routes
app.post('/api/swap-requests', authenticateToken, (req, res) => {
    try {
        const { toUserId, message } = req.body;

        // Check if user exists
        const targetUser = users.find(u => u.id === parseInt(toUserId));
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Check if request already exists
        const existingRequest = swapRequests.find(
            req => req.fromUserId === req.user.id && 
                   req.toUserId === parseInt(toUserId) && 
                   req.status === 'pending'
        );

        if (existingRequest) {
            return res.status(400).json({ error: 'Swap request already sent' });
        }

        const newRequest = {
            id: Date.now(),
            fromUserId: req.user.id,
            toUserId: parseInt(toUserId),
            message: message || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        swapRequests.push(newRequest);

        // Create notification for target user
        const notification = {
            id: Date.now(),
            userId: parseInt(toUserId),
            type: 'swap_request',
            title: 'New Swap Request',
            message: `${users.find(u => u.id === req.user.id).name} sent you a swap request`,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        notifications.push(notification);

        res.status(201).json({
            message: 'Swap request sent successfully',
            request: newRequest
        });
    } catch (error) {
        console.error('Create swap request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/swap-requests', authenticateToken, (req, res) => {
    try {
        const userRequests = swapRequests.filter(
            req => req.fromUserId === req.user.id || req.toUserId === req.user.id
        );

        // Add user details to requests
        const requestsWithUsers = userRequests.map(request => {
            const fromUser = users.find(u => u.id === request.fromUserId);
            const toUser = users.find(u => u.id === request.toUserId);
            return {
                ...request,
                fromUser: { id: fromUser.id, name: fromUser.name, photo: fromUser.photo },
                toUser: { id: toUser.id, name: toUser.name, photo: toUser.photo }
            };
        });

        res.json(requestsWithUsers);
    } catch (error) {
        console.error('Get swap requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/swap-requests/:id', authenticateToken, (req, res) => {
    try {
        const { status } = req.body;
        const requestId = parseInt(req.params.id);

        const requestIndex = swapRequests.findIndex(req => req.id === requestId);
        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Swap request not found' });
        }

        const request = swapRequests[requestIndex];
        
        // Check if user can modify this request
        if (request.toUserId !== req.user.id && request.fromUserId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Update request status
        swapRequests[requestIndex].status = status;

        // Create notification
        const notification = {
            id: Date.now(),
            userId: request.fromUserId === req.user.id ? request.toUserId : request.fromUserId,
            type: 'swap_response',
            title: 'Swap Request Updated',
            message: `Your swap request has been ${status}`,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        notifications.push(notification);

        res.json({
            message: 'Swap request updated successfully',
            request: swapRequests[requestIndex]
        });
    } catch (error) {
        console.error('Update swap request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/swap-requests/:id', authenticateToken, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const requestIndex = swapRequests.findIndex(req => req.id === requestId);

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Swap request not found' });
        }

        const request = swapRequests[requestIndex];
        
        // Check if user can delete this request
        if (request.fromUserId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        swapRequests.splice(requestIndex, 1);

        res.json({ message: 'Swap request deleted successfully' });
    } catch (error) {
        console.error('Delete swap request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Messages routes
app.post('/api/messages', authenticateToken, (req, res) => {
    try {
        const { toUserId, subject, body } = req.body;

        // Check if target user exists
        const targetUser = users.find(u => u.id === parseInt(toUserId));
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        const newMessage = {
            id: Date.now(),
            fromUserId: req.user.id,
            toUserId: parseInt(toUserId),
            subject,
            body,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        messages.push(newMessage);

        // Create notification
        const notification = {
            id: Date.now(),
            userId: parseInt(toUserId),
            type: 'message',
            title: 'New Message',
            message: `You have a new message from ${users.find(u => u.id === req.user.id).name}`,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        notifications.push(notification);

        res.status(201).json({
            message: 'Message sent successfully',
            message: newMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/messages', authenticateToken, (req, res) => {
    try {
        const userMessages = messages.filter(
            msg => msg.fromUserId === req.user.id || msg.toUserId === req.user.id
        );

        // Add user details to messages
        const messagesWithUsers = userMessages.map(message => {
            const fromUser = users.find(u => u.id === message.fromUserId);
            const toUser = users.find(u => u.id === message.toUserId);
            return {
                ...message,
                fromUser: { id: fromUser.id, name: fromUser.name, photo: fromUser.photo },
                toUser: { id: toUser.id, name: toUser.name, photo: toUser.photo }
            };
        });

        res.json(messagesWithUsers);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notifications routes
app.get('/api/notifications', authenticateToken, (req, res) => {
    try {
        const userNotifications = notifications.filter(
            notif => notif.userId === req.user.id
        );

        res.json(userNotifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/notifications/:id', authenticateToken, (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);

        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        notifications[notificationIndex].isRead = true;

        res.json({
            message: 'Notification marked as read',
            notification: notifications[notificationIndex]
        });
    } catch (error) {
        console.error('Update notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    try {
        const allUsers = users.map(user => {
            const { password, ...userResponse } = user;
            return userResponse;
        });
        res.json(allUsers);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/admin/users/:id/ban', authenticateToken, isAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[userIndex].isBanned = true;

        res.json({
            message: 'User banned successfully',
            user: users[userIndex]
        });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/analytics', authenticateToken, isAdmin, (req, res) => {
    try {
        const analytics = {
            totalUsers: users.length,
            activeUsers: users.filter(u => !u.isBanned).length,
            totalSwaps: swapRequests.length,
            pendingSwaps: swapRequests.filter(req => req.status === 'pending').length,
            completedSwaps: swapRequests.filter(req => req.status === 'accepted').length,
            totalMessages: messages.length,
            totalNotifications: notifications.length,
            averageRating: users.reduce((acc, user) => acc + user.rating, 0) / users.length || 0
        };

        res.json(analytics);
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search routes
app.get('/api/search/users', authenticateToken, (req, res) => {
    try {
        const { skill, location } = req.query;
        let filteredUsers = users.filter(user => 
            user.isPublic && !user.isBanned && user.id !== req.user.id
        );

        if (skill) {
            filteredUsers = filteredUsers.filter(user =>
                user.skillsOffered.some(s => s.toLowerCase().includes(skill.toLowerCase())) ||
                user.skillsWanted.some(s => s.toLowerCase().includes(skill.toLowerCase()))
            );
        }

        if (location) {
            filteredUsers = filteredUsers.filter(user =>
                user.location.toLowerCase().includes(location.toLowerCase())
            );
        }

        const usersResponse = filteredUsers.map(user => {
            const { password, ...userResponse } = user;
            return userResponse;
        });

        res.json(usersResponse);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve static files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize demo data
function initializeDemoData() {
    if (users.length === 0) {
        const demoUsers = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                password: bcrypt.hashSync('password123', 10),
                location: 'New York, NY',
                photo: '',
                skillsOffered: ['JavaScript', 'React', 'Web Development'],
                skillsWanted: ['Graphic Design', 'Photography'],
                availability: ['weekends', 'evenings'],
                isPublic: true,
                rating: 4.5,
                totalSwaps: 12,
                role: 'user',
                createdAt: new Date().toISOString(),
                isBanned: false
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: bcrypt.hashSync('password123', 10),
                location: 'Los Angeles, CA',
                photo: '',
                skillsOffered: ['Graphic Design', 'Photoshop', 'Illustration'],
                skillsWanted: ['Cooking', 'Spanish'],
                availability: ['weekends'],
                isPublic: true,
                rating: 4.8,
                totalSwaps: 8,
                role: 'user',
                createdAt: new Date().toISOString(),
                isBanned: false
            },
            {
                id: 3,
                name: 'Mike Johnson',
                email: 'mike@example.com',
                password: bcrypt.hashSync('password123', 10),
                location: 'Chicago, IL',
                photo: '',
                skillsOffered: ['Cooking', 'Baking', 'Italian Cuisine'],
                skillsWanted: ['Excel', 'Data Analysis'],
                availability: ['evenings', 'weekdays'],
                isPublic: true,
                rating: 4.2,
                totalSwaps: 15,
                role: 'user',
                createdAt: new Date().toISOString(),
                isBanned: false
            },
            {
                id: 4,
                name: 'Admin User',
                email: 'admin@skillswap.com',
                password: bcrypt.hashSync('admin123', 10),
                location: 'San Francisco, CA',
                photo: '',
                skillsOffered: ['Project Management', 'Leadership'],
                skillsWanted: ['Technical Skills'],
                availability: ['weekdays'],
                isPublic: true,
                rating: 5.0,
                totalSwaps: 25,
                role: 'admin',
                createdAt: new Date().toISOString(),
                isBanned: false
            }
        ];

        users.push(...demoUsers);
        console.log('Demo data initialized');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeDemoData();
});

module.exports = app;
