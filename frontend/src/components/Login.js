import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    captcha: "",
  });
  const [message, setMessage] = useState("");
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
        credentials: "include", // Ensure cookies are sent with the request
      
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.captcha) {
      setMessage("All fields, including CAPTCHA, are required.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure the session cookie is sent
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage("Login successful!");
        setUser(data.user);
        navigate("/chat");
      } else {
        const error = await response.json();
        setMessage(error.message || "Login failed.");
        fetchCaptcha(); // Refresh CAPTCHA if login fails
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
        backgroundColor: "#f0f4f8",
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Login
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
        {captchaImage && (
          <Box textAlign="center" mb={2}>
            <img src={captchaImage} alt="CAPTCHA" />
            <Button
              variant="outlined"
              color="primary"
              onClick={fetchCaptcha}
              sx={{ mt: 1 }}
            >
              Refresh CAPTCHA
            </Button>
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
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Login
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={() => navigate("/register")}
        >
          Register
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
          <Alert severity={message === "Login successful!" ? "success" : "error"}>
            {message}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default Login;
