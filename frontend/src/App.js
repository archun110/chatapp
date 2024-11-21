import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Chat from "./components/Chat";
import Home from "./components/Home"; // Import the Home component

const App = () => {
  const [user, setUser] = useState(null); // State to store the logged-in user

  const handleLogout = () => {
    setUser(null); // Reset user state to null
  };

  return (
    <Router>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Route for Register */}
        <Route path="/register" element={<Register />} />

        {/* Route for Login */}
        <Route path="/login" element={<Login setUser={setUser} />} />

        {/* Protected Route for Chat */}
        <Route
          path="/chat"
          element={user ? <Chat user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default App;
