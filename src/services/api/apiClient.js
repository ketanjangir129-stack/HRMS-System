const API_URL = "http://localhost:5000/api";

export const apiRequest = async (
    endpoint,
    options = {}
)=>{
    const token = localStorage.getItem("authToken");
    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers:{
                "Content-Type":"application/json",
                ...(token?{
                    Authorization:`Bearer ${token}`,

                }:{}),
                ...(options.headers || {}),
            },
        }
    );
    const data = await response.json();
    return data;
};