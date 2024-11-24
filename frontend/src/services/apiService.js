// src/services/apiService.js
export const fetchData = async () => {
    try {
      const response = await fetch("/api/"); // Adjust the endpoint
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  };
  