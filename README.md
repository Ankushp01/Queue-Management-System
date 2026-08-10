# Queue Management System

A real-time digital queue management system designed to replace physical waiting lines with a centralized token-based system.

The system allows organizations to create and manage multiple service queues while users can obtain and track tokens without creating an account.

## Features

* Organization authentication and management
* Create and manage multiple service queues
* Generate tokens for users without requiring login
* Real-time token and queue status updates
* Token states: Waiting, Served, Cancelled, and Skipped
* Queue states: Working, Paused, and Break
* Automatic token numbering
* Queue statistics such as average waiting time
* Real-time updates using Server-Sent Events (SSE)
* MongoDB Change Streams for detecting database changes
* Transaction-based operations for critical queue updates
* Responsive dashboard built with Tailwind CSS

## Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS

### Backend

* Node.js
* Express.js
* Next.js API routes

### Database

* MongoDB
* Mongoose
* MongoDB Change Streams

### Authentication

* NextAuth.js
* Credentials-based authentication
* JWT sessions

## System Architecture

The application consists of three major parts:

```text
User
 │
 ├── Generate Token
 ├── Search Token
 └── Track Queue Status
          │
          ▼
     Next.js Frontend
          │
          ▼
      Backend APIs
          │
          ▼
       MongoDB
          │
          ▼
   MongoDB Change Streams
          │
          ▼
       SSE Server
          │
          ▼
   Connected Clients
```

## Queue Flow

```text
User selects queue
        ↓
Token generated
        ↓
Token enters WAITING state
        ↓
Queue processes tokens
        ↓
Token becomes SERVED
```

A token can also be cancelled or skipped depending on the queue operation.

## Real-Time Updates

The system uses **MongoDB Change Streams** to detect changes in queue and token documents.

When a relevant database change occurs:

```text
MongoDB Change
      ↓
Change Stream
      ↓
SSE Endpoint
      ↓
Connected Clients
      ↓
UI Updated
```

This avoids repeatedly polling the server for queue changes.

## Data Models

### Organization

Stores organization information and its associated queues.

```text
Organization
├── name
├── description
├── address
├── contactNumber
└── queues
```

### Queue

Represents an individual service queue.

```text
Queue
├── name
├── description
├── nextTokenNumber
├── status
└── avgWaitingTime
```

### Token

Represents a user's position in a queue.

```text
Token
├── queueId
├── tokenNumber
├── phoneNumber
└── status
```

Possible token states:

```text
WAITING
SERVED
CANCELLED
SKIPPED
```

## Key Technical Challenges

### Concurrent Token Generation

Multiple users may request tokens simultaneously. Database operations need to prevent duplicate or inconsistent token numbers.

The system uses transactional database operations for critical updates.

### Real-Time Synchronization

Instead of relying on periodic polling, MongoDB Change Streams detect database changes and SSE pushes relevant updates to connected clients.

### Persistent Token Numbers

Once a token is assigned, its token number remains unchanged throughout its lifecycle.

## Future Improvements

* QR-code based token generation
* Estimated waiting-time prediction
* SMS/WhatsApp notifications
* Multi-branch organization support
* Analytics dashboard
* Redis-based distributed real-time messaging
* Role-based organization staff accounts

## License

This project was developed as an academic/full-stack software project.
