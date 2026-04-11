# Ghost Protocol Hackathon Platform

**Private-by-design micro-donations powered by Zero-Knowledge Proofs**

A complete hackathon management platform with user registration, team management, submission tracking, leaderboard, and payment integration.

## 🎯 Project Status

✅ **Fully converted from Node.js to PHP**  
✅ **Updated pricing structure**  
✅ **Ready for deployment**

## 💰 Registration Fees (Updated)

| Category | Fee | Target Signups | Projected Revenue |
|----------|-----|----------------|-------------------|
| Lone Player | ₦2,500 | 7,000 | ₦17,500,000 |
| Team of 4 | ₦10,000 | 1,000 teams | ₦10,000,000 |
| Team of 10 | ₦20,000 | 500 teams | ₦10,000,000 |
| **Total** | | **8,500 participants** | **₦37,500,000** |

## 🚀 Quick Start

### 1. Check System Status
```powershell
.\check-status.ps1
```

### 2. Install PHP (if needed)
```powershell
.\install-php.ps1
```

### 3. Setup Database
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE ghost_protocol;"

# Run schema
psql -U postgres -d ghost_protocol -f schema.sql
```

### 4. Configure
Edit `config.php` with your database credentials:
```php
$db_host = 'localhost';
$db_name = 'ghost_protocol';
$db_user = 'postgres';
$db_pass = 'your_password';
```

### 5. Start Server
```powershell
.\start-server.ps1
```

### 6. Access
Visit: **http://localhost:8000**

## 📁 Project Structure

### PHP Backend (New)
- `config.php` - Database configuration
- `helpers.php` - JWT & authentication utilities
- `api-*.php` - 11 API endpoints

### Frontend (Updated)
- `index.html` - Landing page (updated pricing)
- `login.html` - Login/registration
- `lone.html` - Solo player dashboard
- `team4.html` - Team of 4 dashboard
- `team10.html` - Team of 10 dashboard
- `admin.html` - Admin dashboard
- `pending-payment.html` - Payment pending page

### Database
- `schema.sql` - PostgreSQL schema with triggers

### Installation Scripts
- `install-php.ps1` - Automated PHP installer
- `start-server.ps1` - Development server launcher
- `check-status.ps1` - System status checker
- `test-php.php` - PHP verification script

### Documentation
- `README.md` - This file
- `QUICK-START.md` - Quick start guide
- `README-PHP.md` - Detailed PHP documentation
- `INSTALL-PHP-WINDOWS.md` - Windows installation guide
- `CONVERSION-SUMMARY.md` - Conversion details

## 🔌 API Endpoints

### Public
- `POST /api-login` - User authentication
- `POST /api-register` - User registration

### Protected (Requires JWT)
- `GET /api-me` - Get current user profile
- `GET /api-leaderboard` - Get leaderboard data
- `GET /api-submissions` - Get user/team submissions
- `POST /api-submissions` - Submit project
- `GET /api-team` - Get team details
- `GET /api-payment-status` - Check payment status

### Admin Only
- `GET /api-admin-contestants` - List all contestants
- `GET /api-admin-submissions` - List all submissions
- `POST /api-admin-submissions` - Score submissions

### Webhook
- `POST /api-webhook` - Paystack payment webhook

## ✨ Features

- ✅ User registration (lone/team_4/team_10)
- ✅ JWT authentication
- ✅ Team creation & management
- ✅ 11-round submission system
- ✅ Real-time leaderboard
- ✅ Paystack payment integration
- ✅ Payment verification
- ✅ Admin dashboard
- ✅ Role-based access control
- ✅ Automated scoring & ranking

## 🛠️ Technology Stack

### Backend
- **PHP 8.0+** - Server-side language
- **PostgreSQL 12+** - Database
- **PDO** - Database abstraction
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling
- **Vanilla JavaScript** - Interactivity
- **Paystack** - Payment processing

### Server
- **Apache** - Web server (with mod_rewrite)
- **PHP Built-in Server** - Development

## 🔒 Security

- JWT-based authentication
- Bcrypt password hashing (cost: 12)
- SQL injection protection (prepared statements)
- CORS configuration
- Input validation
- XSS protection
- Payment webhook verification

## 📊 Database Schema

### Tables
- `users` - User accounts
- `teams` - Team information
- `team_members` - Team membership
- `submissions` - Project submissions
- `submission_rounds` - Round schedules
- `leaderboard` - Rankings

### Triggers
- Payment eligibility check
- Automatic leaderboard updates
- Team size enforcement
- Timestamp management

## 🧪 Testing

```powershell
# Test PHP installation
php test-php.php

# Test API login
curl http://localhost:8000/api-login `
  -Method POST `
  -Body '{"email":"test@example.com","password":"password123"}' `
  -ContentType "application/json"

# Check system status
.\check-status.ps1
```

## 📦 Requirements

- **PHP 8.0+** with extensions:
  - pdo
  - pdo_pgsql
  - json
  - openssl
  - mbstring
- **PostgreSQL 12+**
- **Apache** (with mod_rewrite) or **Nginx**
- **Windows** (scripts optimized for Windows)

## 🚀 Production Deployment

1. **Install on production server**
   - Use Apache or Nginx (not built-in PHP server)
   - Configure virtual host

2. **Security hardening**
   - Set strong `JWT_SECRET`
   - Enable HTTPS with SSL certificate
   - Configure firewall rules
   - Set file permissions (644 for PHP files)

3. **Performance optimization**
   - Enable PHP opcache
   - Configure PostgreSQL connection pooling
   - Use CDN for static assets

4. **Payment setup**
   - Configure Paystack webhook URL
   - Enable signature verification
   - Test payment flow

## 📝 Environment Variables

```env
DB_HOST=localhost
DB_NAME=ghost_protocol
DB_USER=postgres
DB_PASS=your_password
DB_PORT=5432
JWT_SECRET=your-secret-key-here
PAYSTACK_SECRET_KEY=your-paystack-secret
```

## 🐛 Troubleshooting

### PHP not found
```powershell
# Run installer
.\install-php.ps1

# Or check PATH
$env:Path
```

### Database connection failed
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Test connection
psql -U postgres -d ghost_protocol -c "SELECT 1;"
```

### Extension not loaded
```powershell
# Check loaded extensions
php -m

# Edit php.ini to enable extensions
```

## 📚 Documentation

- **Quick Start**: `QUICK-START.md`
- **PHP Setup**: `README-PHP.md`
- **Windows Install**: `INSTALL-PHP-WINDOWS.md`
- **Conversion Details**: `CONVERSION-SUMMARY.md`

## 🎓 Event Details

- **Event**: Ghost Protocol Hackathon
- **Organizer**: FLINN Software Labs
- **Duration**: July 1-31, 2026 (31 days)
- **Rounds**: 11 submission rounds
- **Prize Pool**: ₦27,000,000 total

## 📄 License

© 2026 FLINN Software Labs. All rights reserved.

## 🤝 Support

For issues or questions:
1. Check documentation files
2. Run `.\check-status.ps1` for diagnostics
3. Review error logs
4. Contact FLINN Software Labs support

---

**Status**: ✅ Ready for Deployment  
**Last Updated**: April 11, 2026  
**Version**: 2.0 (PHP)
