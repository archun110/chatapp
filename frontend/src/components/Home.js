import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";

const Home = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/register");
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
        <Typography variant="h3" sx={{ fontWeight: "bold", mb: 2 }}>
          4334-Project
        </Typography>
        <Typography variant="h4" sx={{ color: "#1976d2" }}>
          Secure ChatApp
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "50%",
          maxWidth: "300px",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ padding: "10px 0" }}
          onClick={handleLogin}
        >
          Login
        </Button>
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          sx={{ padding: "10px 0" }}
          onClick={handleRegister}
        >
          Register
        </Button>
      </Box>
    </Box>
  );
};

export default Home;
