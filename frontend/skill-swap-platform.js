// Skill Swap Platform JavaScript

// Global variables
let currentUser = null;
let users = [];
let swapRequests = [];
let currentSection = 'dashboard';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is logged in
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
        loadUserData();
    } else {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Load initial data
    loadUsers();
    loadSwapRequests();
    updateDashboard();
    
    // Show dashboard by default
    showSection('dashboard');
    
    // Check if user is admin
    if (currentUser.role === 'admin') {
        document.getElementById('admin-link').style.display = 'block';
    }
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.remove('d-none');
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'browse':
            loadUsers();
            break;
        case 'requests':
            loadSwapRequests();
            break;
        case 'profile':
            loadProfileForm();
            break;
        case 'admin':
            if (currentUser.role === 'admin') {
                loadAdminData();
            }
            break;
    }
}

// User management functions
function loadUserData() {
    // Load user data from localStorage or initialize
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        // Initialize with sample data
        users = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                location: 'New York, NY',
                photo: 'https://via.placeholder.com/120',
                skillsOffered: ['JavaScript', 'React', 'Web Development'],
                skillsWanted: ['Graphic Design', 'Photography'],
                availability: ['weekends', 'evenings'],
                isPublic: true,
                rating: 4.5,
                totalSwaps: 12,
                role: 'user'
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: 'password123',
                location: 'Los Angeles, CA',
                photo: 'https://via.placeholder.com/120',
                skillsOffered: ['Graphic Design', 'Photoshop', 'Illustration'],
                skillsWanted: ['Cooking', 'Spanish'],
                availability: ['weekends'],
                isPublic: true,
                rating: 4.8,
                totalSwaps: 8,
                role: 'user'
            },
            {
                id: 3,
                name: 'Mike Johnson',
                email: 'mike@example.com',
                password: 'password123',
                location: 'Chicago, IL',
                photo: 'https://via.placeholder.com/120',
                skillsOffered: ['Cooking', 'Baking', 'Italian Cuisine'],
                skillsWanted: ['Excel', 'Data Analysis'],
                availability: ['evenings', 'weekdays'],
                isPublic: true,
                rating: 4.2,
                totalSwaps: 15,
                role: 'user'
            },
            {
                id: 4,
                name: 'Admin User',
                email: 'admin@skillswap.com',
                password: 'admin123',
                location: 'San Francisco, CA',
                photo: 'https://via.placeholder.com/120',
                skillsOffered: ['Project Management', 'Leadership'],
                skillsWanted: ['Technical Skills'],
                availability: ['weekdays'],
                isPublic: true,
                rating: 5.0,
                totalSwaps: 25,
                role: 'admin'
            }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
}

function loadUsers() {
    const usersGrid = document.getElementById('users-grid');
    const publicUsers = users.filter(user => user.isPublic && user.id !== currentUser.id);
    
    usersGrid.innerHTML = '';
    
    publicUsers.forEach(user => {
        const userCard = createUserCard(user);
        usersGrid.appendChild(userCard);
    });
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    card.innerHTML = `
        <div class="user-card-header">
            <img src="${user.photo}" alt="${user.name}" class="user-avatar">
            <h3>${user.name}</h3>
            <p>${user.location}</p>
            <div class="skill-tags">
                ${user.skillsOffered.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        </div>
        <div class="user-card-body">
            <h4>Skills Wanted:</h4>
            <div class="skill-tags">
                ${user.skillsWanted.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            <p><strong>Rating:</strong> ${user.rating}/5 (${user.totalSwaps} swaps)</p>
            <button class="btn btn-primary" onclick="openUserModal(${user.id})">Request Swap</button>
        </div>
    `;
    
    return card;
}

// Profile management
function loadProfileForm() {
    const user = currentUser;
    
    document.getElementById('name').value = user.name;
    document.getElementById('location').value = user.location || '';
    document.getElementById('public-profile').checked = user.isPublic;
    
    // Load skills
    loadSkillTags('offered-skills-tags', user.skillsOffered);
    loadSkillTags('wanted-skills-tags', user.skillsWanted);
    
    // Load availability
    user.availability.forEach(avail => {
        const checkbox = document.querySelector(`input[value="${avail}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

function updateProfile(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const availability = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    // Update current user
    currentUser.name = document.getElementById('name').value;
    currentUser.location = document.getElementById('location').value;
    currentUser.isPublic = document.getElementById('public-profile').checked;
    currentUser.availability = availability;
    
    // Update skills from tags
    currentUser.skillsOffered = getSkillsFromTags('offered-skills-tags');
    currentUser.skillsWanted = getSkillsFromTags('wanted-skills-tags');
    
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
    } else {
        users.push(currentUser);
    }
    
    // Save to localStorage
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('Profile updated successfully!');
    showSection('dashboard');
}

function addSkill(type) {
    const inputId = type === 'offered' ? 'skill-offered' : 'skill-wanted';
    const tagsId = type === 'offered' ? 'offered-skills-tags' : 'wanted-skills-tags';
    
    const input = document.getElementById(inputId);
    const skill = input.value.trim();
    
    if (skill) {
        const tagsContainer = document.getElementById(tagsId);
        const tag = document.createElement('span');
        tag.className = 'skill-tag remove';
        tag.innerHTML = `${skill} <i class="fas fa-times" onclick="removeSkill(this)"></i>`;
        tagsContainer.appendChild(tag);
        input.value = '';
    }
}

function removeSkill(element) {
    element.parentElement.remove();
}

function loadSkillTags(containerId, skills) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    skills.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag remove';
        tag.innerHTML = `${skill} <i class="fas fa-times" onclick="removeSkill(this)"></i>`;
        container.appendChild(tag);
    });
}

function getSkillsFromTags(containerId) {
    const container = document.getElementById(containerId);
    const tags = container.querySelectorAll('.skill-tag');
    return Array.from(tags).map(tag => tag.textContent.trim().replace('×', '').trim());
}

// Swap request functions
function openUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('modal-user-name').textContent = user.name;
    document.getElementById('modal-user-details').innerHTML = `
        <p><strong>Location:</strong> ${user.location}</p>
        <p><strong>Skills Offered:</strong> ${user.skillsOffered.join(', ')}</p>
        <p><strong>Skills Wanted:</strong> ${user.skillsWanted.join(', ')}</p>
        <p><strong>Rating:</strong> ${user.rating}/5</p>
    `;
    
    document.getElementById('user-modal').style.display = 'block';
    window.selectedUserId = userId;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function sendSwapRequest() {
    const message = document.getElementById('swap-message').value;
    const targetUserId = window.selectedUserId;
    
    const request = {
        id: Date.now(),
        fromUserId: currentUser.id,
        toUserId: targetUserId,
        message: message,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    swapRequests.push(request);
    localStorage.setItem('swapRequests', JSON.stringify(swapRequests));
    
    closeModal('user-modal');
    alert('Swap request sent successfully!');
    
    // Clear message
    document.getElementById('swap-message').value = '';
}

function loadSwapRequests() {
    const sentContainer = document.getElementById('sent-requests');
    const receivedContainer = document.getElementById('received-requests');
    
    const sentRequests = swapRequests.filter(req => req.fromUserId === currentUser.id);
    const receivedRequests = swapRequests.filter(req => req.toUserId === currentUser.id);
    
    // Display sent requests
    sentContainer.innerHTML = '<h3>Sent Requests</h3>';
    sentRequests.forEach(request => {
        const targetUser = users.find(u => u.id === request.toUserId);
        if (targetUser) {
            const requestElement = createRequestElement(request, targetUser, 'sent');
            sentContainer.appendChild(requestElement);
        }
    });
    
    // Display received requests
    receivedContainer.innerHTML = '<h3>Received Requests</h3>';
    receivedRequests.forEach(request => {
        const fromUser = users.find(u => u.id === request.fromUserId);
        if (fromUser) {
            const requestElement = createRequestElement(request, fromUser, 'received');
            receivedContainer.appendChild(requestElement);
        }
    });
}

function createRequestElement(request, user, type) {
    const div = document.createElement('div');
    div.className = 'request-item';
    
    const statusClass = request.status === 'pending' ? 'warning' : 
                       request.status === 'accepted' ? 'success' : 'danger';
    
    div.innerHTML = `
        <div class="request-info">
            <h4>${user.name}</h4>
            <p><strong>Status:</strong> <span class="text-${statusClass}">${request.status}</span></p>
            ${request.message ? `<p><strong>Message:</strong> ${request.message}</p>` : ''}
            <p><strong>Date:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="request-actions">
            ${type === 'received' && request.status === 'pending' ? `
                <button class="btn btn-success" onclick="respondToRequest(${request.id}, 'accepted')">Accept</button>
                <button class="btn btn-danger" onclick="respondToRequest(${request.id}, 'rejected')">Reject</button>
            ` : ''}
            ${request.status === 'pending' ? `
                <button class="btn btn-danger" onclick="deleteRequest(${request.id})">Delete</button>
            ` : ''}
        </div>
    `;
    
    return div;
}

function respondToRequest(requestId, response) {
    const request = swapRequests.find(req => req.id === requestId);
    if (request) {
        request.status = response;
        localStorage.setItem('swapRequests', JSON.stringify(swapRequests));
        loadSwapRequests();
    }
}

function deleteRequest(requestId) {
    swapRequests = swapRequests.filter(req => req.id !== requestId);
    localStorage.setItem('swapRequests', JSON.stringify(swapRequests));
    loadSwapRequests();
}

// Search functionality
function searchUsers(event) {
    event.preventDefault();
    const searchTerm = document.getElementById('search-skill').value.toLowerCase();
    
    const filteredUsers = users.filter(user => 
        user.isPublic && 
        user.id !== currentUser.id &&
        (user.skillsOffered.some(skill => skill.toLowerCase().includes(searchTerm)) ||
         user.skillsWanted.some(skill => skill.toLowerCase().includes(searchTerm)))
    );
    
    const usersGrid = document.getElementById('users-grid');
    usersGrid.innerHTML = '';
    
    filteredUsers.forEach(user => {
        const userCard = createUserCard(user);
        usersGrid.appendChild(userCard);
    });
}

// Dashboard functions
function updateDashboard() {
    const user = currentUser;
    
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-location').textContent = user.location || 'Location not set';
    document.getElementById('profile-photo').src = user.photo || 'https://via.placeholder.com/120';
    
    // Update skills display
    const skillsContainer = document.getElementById('offered-skills');
    skillsContainer.innerHTML = user.skillsOffered.map(skill => 
        `<span class="skill-tag">${skill}</span>`
    ).join('');
    
    // Update stats
    const userRequests = swapRequests.filter(req => 
        req.fromUserId === user.id || req.toUserId === user.id
    );
    
    document.getElementById('total-swaps').textContent = user.totalSwaps || 0;
    document.getElementById('pending-requests').textContent = 
        userRequests.filter(req => req.status === 'pending').length;
    document.getElementById('rating').textContent = user.rating || '0.0';
}

// Admin functions
function loadAdminData() {
    if (currentUser.role !== 'admin') return;
    
    loadUsersList();
    loadSwapsList();
}

function showAdminTab(tabName) {
    // Hide all admin content
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('d-none');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`admin-${tabName}`).classList.remove('d-none');
    event.target.classList.add('active');
}

function loadUsersList() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'request-item';
        userDiv.innerHTML = `
            <div class="request-info">
                <h4>${user.name}</h4>
                <p>${user.location}</p>
                <p>Role: ${user.role}</p>
            </div>
            <div class="request-actions">
                <button class="btn btn-danger" onclick="banUser(${user.id})">Ban User</button>
            </div>
        `;
        usersList.appendChild(userDiv);
    });
}

function loadSwapsList() {
    const swapsList = document.getElementById('swaps-list');
    swapsList.innerHTML = '';
    
    swapRequests.forEach(request => {
        const fromUser = users.find(u => u.id === request.fromUserId);
        const toUser = users.find(u => u.id === request.toUserId);
        
        if (fromUser && toUser) {
            const swapDiv = document.createElement('div');
            swapDiv.className = 'request-item';
            swapDiv.innerHTML = `
                <div class="request-info">
                    <h4>${fromUser.name} → ${toUser.name}</h4>
                    <p>Status: ${request.status}</p>
                    <p>Date: ${new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
            `;
            swapsList.appendChild(swapDiv);
        }
    });
}

function banUser(userId) {
    if (confirm('Are you sure you want to ban this user?')) {
        const user = users.find(u => u.id === userId);
        if (user) {
            user.isBanned = true;
            localStorage.setItem('users', JSON.stringify(users));
            loadUsersList();
        }
    }
}

function downloadReport(type) {
    let data;
    let filename;
    
    if (type === 'users') {
        data = users.map(user => ({
            name: user.name,
            location: user.location,
            totalSwaps: user.totalSwaps,
            rating: user.rating,
            isBanned: user.isBanned || false
        }));
        filename = 'users-report.json';
    } else {
        data = swapRequests.map(request => ({
            fromUser: users.find(u => u.id === request.fromUserId)?.name,
            toUser: users.find(u => u.id === request.toUserId)?.name,
            status: request.status,
            createdAt: request.createdAt
        }));
        filename = 'swaps-report.json';
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function sendPlatformMessage(event) {
    event.preventDefault();
    
    const subject = document.getElementById('message-subject').value;
    const content = document.getElementById('message-content').value;
    
    // In a real application, this would send to all users
    alert(`Platform message sent!\nSubject: ${subject}\nContent: ${content}`);
    
    // Clear form
    event.target.reset();
}

// Utility functions
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Load swap requests from localStorage
const savedRequests = localStorage.getItem('swapRequests');
if (savedRequests) {
    swapRequests = JSON.parse(savedRequests);
} else {
    swapRequests = [];
}