# Atreo

<div align="center">

![Atreo Logo](https://via.placeholder.com/200x60/4F46E5/FFFFFF?text=Atreo)

**A Comprehensive Tool and Invoice Management Platform**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.1.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Atreo is a modern, full-stack application designed for comprehensive management of tools, invoices, organizations, employees, and financial data. It provides intelligent analytics, AI-powered insights, and a user-friendly interface for both administrators and employees.

### Key Capabilities

- **Tool Management**: Track and manage software tools, subscriptions, and credentials
- **Invoice Processing**: Automated invoice parsing with AI-powered extraction
- **Financial Analytics**: Comprehensive dashboards with real-time insights
- **Organization Management**: Multi-organization support with role-based access
- **AI Assistant**: Intelligent data analysis and recommendations
- **Employee Management**: Payroll, submissions, and contractor tracking
- **Asset & Domain Management**: Complete inventory tracking

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Super Admin, User)
- Module-level permissions
- OTP verification support
- Secure password hashing

### 📊 Dashboard & Analytics
- Real-time financial metrics
- Interactive charts and graphs
- Spending analysis by category, organization, and time period
- Invoice status tracking
- Tool utilization reports
- Customizable time frame filters

### 🤖 AI-Powered Features
- Intelligent invoice parsing using OpenAI Vision API
- Natural language query interface
- Comprehensive data analysis
- Professional formatted responses
- Adaptive response formatting based on query type

### 💼 Invoice Management
- Automated invoice parsing (PDF, images, text)
- Multi-currency support
- Status tracking (Pending, Approved, Rejected)
- Invoice categorization
- Provider analysis
- Bulk import/export capabilities

### 🛠️ Tool Management
- Complete tool inventory
- Credential management
- Billing period tracking
- Category organization
- Tool sharing across organizations
- 2FA and autopay tracking

### 👥 User & Organization Management
- Multi-organization support
- Employee and contractor management
- User role assignment
- Permission management
- Audit logging

### 📦 Additional Features
- Asset management
- Domain tracking
- Payment processing
- Message system
- Customer management
- System logs and audit trails

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Chart.js** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication
- **OpenAI API** - AI features
- **Multer** - File upload handling
- **PDF.js** - PDF processing
- **Tesseract.js** - OCR capabilities
- **Nodemailer** - Email service

### Development Tools
- **ESLint** - Code linting
- **Vitest** - Testing framework
- **Husky** - Git hooks
- **TypeScript** - Type checking

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn** or **bun**
- **MongoDB** (local or cloud instance)
- **Git**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/invisiedge/Atreo.git
cd Atreo
```

### 2. Install Frontend Dependencies

```bash
cd Atreo
npm install
```

### 3. Install Backend Dependencies

```bash
cd atreo-backend
npm install
```

## ⚙️ Configuration

### Backend Configuration

1. Create a `.env` file in the `atreo-backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://lokeshmv_db_user:dKsaYc3gdQBIk8H0@invisiedge.ac0dzm7.mongodb.net/atreo-development?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# File Storage (optional - for cloud storage)
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### Frontend Configuration

1. Create a `.env` file in the `Atreo` directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🎮 Usage

### Development Mode

#### Start Backend Server

```bash
cd atreo-backend
npm run dev
```

The backend server will start on `http://localhost:3001`

#### Start Frontend Development Server

```bash
cd Atreo
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Production Build

#### Build Frontend

```bash
cd Atreo
npm run build
```

#### Start Backend in Production

```bash
cd atreo-backend
npm start
```

### Database Seeding (Optional)

```bash
cd atreo-backend
npm run seed
```

## 📁 Project Structure

```
Atreo/
├── atreo-backend/          # Backend application
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── scripts/           # Utility scripts
│   ├── tests/             # Backend tests
│   └── server.js          # Entry point
│
├── src/                   # Frontend source code
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── services/           # API services
│   ├── hooks/              # Custom React hooks
│   ├── store/              # State management
│   ├── context/            # React contexts
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript types
│
├── public/                 # Static assets
└── dist/                   # Production build output
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/profile` - Get current user profile

### Dashboard Endpoints

- `GET /api/dashboard/stats` - Get dashboard statistics

### Invoice Endpoints

- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `POST /api/invoices/parse` - Parse invoice file
- `GET /api/invoices/:id` - Get invoice by ID
- `PATCH /api/invoices/:id/approve` - Approve invoice
- `PATCH /api/invoices/:id/reject` - Reject invoice

### Tool Endpoints

- `GET /api/tools` - Get all tools
- `POST /api/tools` - Create new tool
- `GET /api/tools/:id` - Get tool by ID
- `PATCH /api/tools/:id` - Update tool
- `DELETE /api/tools/:id` - Delete tool

### AI Endpoints

- `POST /api/ai/ask` - Ask AI assistant a question

### User Management Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

*For complete API documentation, refer to the API routes in `atreo-backend/routes/`*

## 💻 Development

### Code Style

The project uses ESLint for code linting. Run linting with:

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run type-check
```

### Git Hooks

The project uses Husky for git hooks. Pre-commit hooks will run linting automatically.

## 🧪 Testing

### Frontend Tests

```bash
npm run test
npm run test:ui
npm run test:coverage
```

### Backend Tests

```bash
cd atreo-backend
npm test
npm run test:watch
npm run test:coverage
```

## 🚢 Deployment

### Backend Deployment

The backend can be deployed to:
- **Railway** (configured with `railway.json`)
- **Heroku**
- **AWS**
- **DigitalOcean**
- Any Node.js hosting platform

### Frontend Deployment

The frontend can be deployed to:
- **Vercel** (configured with `vercel.json`)
- **Netlify**
- **AWS S3 + CloudFront**
- Any static hosting service

### Environment Variables

Ensure all environment variables are set in your deployment platform.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code of Conduct

- Be respectful and inclusive
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the ISC License.

## 👥 Authors

- **Invisiedge** - [GitHub](https://github.com/invisiedge)

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database services
- All open-source contributors whose packages made this project possible

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

<div align="center">

**Built with ❤️ by the Atreo Team**

[Report Bug](https://github.com/invisiedge/Atreo/issues) · [Request Feature](https://github.com/invisiedge/Atreo/issues) · [Documentation](#)

</div>

