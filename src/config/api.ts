import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle token refresh (optional but recommended if using refresh token)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Return early if the error is from the refresh token endpoint to avoid infinite loops
    if (
      error.response?.status === 401 &&
      error.config.url !== "/auth/refresh"
    ) {
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const { data } = await axios.post(
            "http://localhost:5000/api/v1/auth/refresh",
            {
              refreshToken,
            },
          );

          // If successful, save new token
          if (data && data.data && data.data.token) {
            localStorage.setItem("token", data.data.token);

            // Retry the original request
            error.config.headers.Authorization = `Bearer ${data.data.token}`;

            return axios(error.config);
          }
        } catch {
          // If refresh fails, clear tokens and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
