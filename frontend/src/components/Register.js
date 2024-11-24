import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    captcha: "",
  });

  const [message, setMessage] = useState("");
  const [passwordStrengthMessage, setPasswordStrengthMessage] = useState("");
  const [captchaImage, setCaptchaImage] = useState(null);
  const navigate = useNavigate();

  // Fetch the CAPTCHA image on component mount or refresh
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const response = await fetch("http://localhost:5000/captcha", {
        method: "GET",
        credentials: "include", // Include cookies for session
      });
      const blob = await response.blob();
      setCaptchaImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Failed to fetch CAPTCHA:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Check password strength
    if (name === "password") {
      validatePasswordStrength(value);
    }
  };

  const validatePasswordStrength = (password) => {
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setPasswordStrengthMessage(
        "Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters."
      );
    } else {
      setPasswordStrengthMessage(""); // Clear the message if the password is strong
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.captcha) {
      setMessage("All fields, including CAPTCHA, are required.");
      return;
    }

    if (passwordStrengthMessage) {
      setMessage("Please provide a stronger password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("Registration successful!");
        setFormData({ username: "", email: "", password: "", captcha: "" });
        fetchCaptcha(); // Refresh CAPTCHA after successful registration
      } else {
        const error = await response.json();
        setMessage(error.message || "Registration failed.");
        fetchCaptcha(); // Refresh CAPTCHA if registration fails
      }
    } catch (err) {
      setMessage("Error: Unable to connect to the server.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Register
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "50%",
          maxWidth: "400px",
        }}
      >
        <TextField
          label="Username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          fullWidth
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          fullWidth
          required
        />
        {passwordStrengthMessage && (
          <Typography variant="body2" color="error">
            {passwordStrengthMessage}
          </Typography>
        )}
        {captchaImage && (
          <Box textAlign="center">
            <img src={captchaImage} alt="CAPTCHA" />
          </Box>
        )}
        <TextField
          label="CAPTCHA"
          name="captcha"
          type="text"
          value={formData.captcha}
          onChange={handleChange}
          fullWidth
          required
        />
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={fetchCaptcha}
        >
          Refresh CAPTCHA
        </Button>
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Register
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={() => navigate("/")}
        >
          Back
        </Button>
      </Box>

      {message && (
        <Box mt={2} width="50%" maxWidth="400px">
          <Alert severity={message === "Registration successful!" ? "success" : "error"}>
            {message}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default Register;
