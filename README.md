# Queue Management System

A modern full-stack queue management system that replaces physical waiting lines with virtual queues. Organizations can create and manage queues, while users can join, monitor their position, and receive real-time updates.

---

## ✨ Features

### Public
- Browse available queues
- Join a queue without creating an account
- Live queue status tracking
- Estimated waiting time
- View current token being served

### Admin
- Create and manage queues
- Pause and resume queues
- Call next token
- Mark tokens as served
- Monitor queue statistics
- Dashboard for queue management

### System
- Secure authentication
- Real-time updates
- Responsive UI
- REST API
- Role-based access

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- Next.js API Routes
- MongoDB
- Mongoose
- JWT Authentication

### Other Tools
- Git
- GitHub

---

## 📂 Project Structure

```
src/
├── app/
├── components/
├── models/
├── services/
├── providers/
├── lib/
├── middleware.ts
└── types/
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/Ankushp01/Queue-Management-System.git
```

### Install dependencies

```bash
npm install
```

### Create environment variables

Create a `.env.local` file.

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
```

### Run the development server

```bash
npm run dev
```

Visit:

```
http://localhost:3000
```

---

## 📸 Screenshots

Coming Soon

---

## 🗺️ Roadmap

- [ ] Email/SMS notifications
- [ ] QR code queue joining
- [ ] Analytics dashboard
- [ ] Multi-branch support
- [ ] Appointment scheduling
- [ ] Queue history
- [ ] Estimated wait prediction using historical data

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

---

## 📄 License

This project is licensed under the MIT License.
