const API_URL = "http://localhost:5000/api";
import { apiRequest } from "./apiClient";
export const loginEmployeeApi = async (
    companyCode,
    userId,
    password
) => {
    try {
        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyCode,
                    userId,
                    password,
                }),
            }
        );
        const data = await response.json();
        return data;

    }
    catch (error) {
        console.error("Employee login API error:", error);

        return {
            success: false,
            message: "Unable to connect to authentication server."
        };
    }
};


export const changePasswordApi = async (
    companyCode,
    employeeId,
    currentPassword,
    newPassword

) => {
    try {
        const response = await fetch(`${API_URL}/auth/change-password`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyCode,
                    employeeId,
                    currentPassword,
                    newPassword,
                }),
            }
        );
        const data = await response.json();
        return data;

    }
    catch (error) {
        console.error("Change password API error:", error);
        return {
            success: false,
            message: "Unable to connect to authentication server"
        };
    }
};
export const getCurrentUserApi = async () => {
  try {
    return await apiRequest("/auth/me");
  } catch (error) {
    console.error(
      "Get current user API error:",
      error
    );

    return {
      success: false,
      message: "Unable to authenticate user.",
    };
  }
};