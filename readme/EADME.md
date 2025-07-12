# Skill Swap Platform

A comprehensive web application that enables users to list their skills and request skill exchanges with others. Built with HTML, CSS, and JavaScript.

## Features

### User Features
- **Profile Management**: Create and edit profiles with basic info, skills offered/wanted, and availability
- **Skill Listing**: Add and manage skills you can offer and skills you want to learn
- **User Discovery**: Browse and search for other users by skills
- **Swap Requests**: Send and manage swap requests with other users
- **Request Management**: Accept, reject, or delete swap requests
- **Privacy Control**: Make profiles public or private
- **Rating System**: View user ratings and feedback

### Admin Features
- **User Management**: View all users and ban inappropriate users
- **Swap Monitoring**: Monitor all swap requests and their status
- **Reports**: Download user activity and swap statistics
- **Platform Messages**: Send announcements to all users
- **Content Moderation**: Reject inappropriate skill descriptions

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software required

### Installation
1. Download or clone the repository
2. Open `login.html` in your web browser
3. Use one of the demo accounts or create a new account

### Demo Accounts
- **John Doe** (john@example.com / password123) - Regular User
- **Jane Smith** (jane@example.com / password123) - Regular User  
- **Mike Johnson** (mike@example.com / password123) - Regular User
- **Admin** (admin@skillswap.com / admin123) - Administrator

## Usage

### For Regular Users

1. **Login**: Use the login page to access your account
2. **Dashboard**: View your profile, stats, and recent activity
3. **Browse Users**: Search for users by skills and view their profiles
4. **Send Requests**: Click "Request Swap" to send a swap request
5. **Manage Requests**: Accept or reject incoming requests in the "My Requests" section
6. **Edit Profile**: Update your skills, availability, and profile information

### For Administrators

1. **Admin Panel**: Access the admin panel from the navigation menu
2. **User Management**: View all users and ban inappropriate accounts
3. **Swap Monitoring**: Monitor all swap activities
4. **Reports**: Download user and swap statistics
5. **Platform Messages**: Send announcements to all users

## File Structure

```
skill-swap-platform/
├── skill-swap-platform.html    # Main application page
├── skill-swap-platform.js      # Application logic
├── login.html                  # Login page
└── README.md                   # Documentation
```

## Technical Details

### Technologies Used
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling with custom properties and responsive design
- **JavaScript (ES6+)**: Application logic and interactivity
- **LocalStorage**: Data persistence
- **Font Awesome**: Icons

### Key Features Implementation

#### User Authentication
- Simple email/password authentication
- Session management with localStorage
- Demo accounts for testing

#### Data Management
- All data stored in browser localStorage
- JSON format for easy data manipulation
- Automatic data persistence

#### Responsive Design
- Mobile-first approach
- CSS Grid and Flexbox for layouts
- Responsive breakpoints for different screen sizes

#### Interactive Elements
- Modal dialogs for user interactions
- Dynamic content loading
- Real-time updates

## Features Breakdown

### Profile Management
- Name, location, and profile photo
- Skills offered and wanted with tag-based interface
- Availability settings (weekends, evenings, weekdays)
- Public/private profile toggle

### User Discovery
- Browse all public users
- Search by specific skills
- View user ratings and swap history
- Filter by location and availability

### Swap System
- Send swap requests with optional messages
- Accept or reject incoming requests
- Delete pending requests
- Track request status and history

### Admin Functions
- User management with ban capabilities
- Swap monitoring and statistics
- Report generation and download
- Platform-wide messaging system

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Future Enhancements

- Real-time messaging system
- Video call integration
- Skill verification system
- Advanced search filters
- Mobile app development
- Payment integration for premium features
- Social media integration
- Skill certification system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For support or questions, please open an issue in the repository.

---

**Note**: This is a demo application using localStorage for data persistence. In a production environment, you would need a backend server and database for proper data management and security. 