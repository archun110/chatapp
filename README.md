# Comp 4334 group-project chatapp
comp4334


# Chat Application

A real-time encrypted chat application built with **React**, **Node.js**, **Socket.IO**, and **MySQL**. This project allows users to securely exchange messages using end-to-end encryption (E2EE) via public/private key pairs.

---

## Features

- **User Authentication**: Users can register and log in with their credentials.
- **Real-Time Messaging**: Instant messaging between users powered by Socket.IO.
- **End-to-End Encryption**: Messages are encrypted with public/private key pairs and decrypted only by the intended recipient.
- **Key Exchange**: Users can securely exchange public keys to establish shared secrets.
- **Responsive UI**: Built with React and Material-UI for a modern and user-friendly experience.

---

## Tech Stack

### Front-End:
- **React**: UI library for building the user interface.
- **Material-UI**: Styling and responsive design components.
- **React Router**: Handles routing within the application.
- **CryptoUtils**: Implements public/private key generation, encryption, and decryption logic.

### Back-End:
- **Node.js**: JavaScript runtime for building the server.
- **Express**: Web framework for handling API routes.
- **Socket.IO**: Real-time bi-directional communication for chat messages.
- **MySQL**: Database for storing user and message data.

### Additional Libraries:
- **http-proxy-middleware**: For handling proxies in the front-end.
- **bcrypt**: For hashing passwords securely.
- **svg-captcha**: To generate CAPTCHA for added security.

---

## Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/archun110/chatapp.git
cd chatapp
docker-compose up --build
```


### Usage
- **Register**: Create a new user account.
- **Login**: Log in with your credentials.
- **Select a Chat Partner**: Choose a user to chat with from the dropdown menu.
- **Exchange Keys**: Enter the recipient's public key to establish encryption.
- **Send Messages**: Type a message and click "Send" to deliver it securely.