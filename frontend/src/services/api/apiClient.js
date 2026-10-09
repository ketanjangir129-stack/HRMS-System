const API_URL = "http://localhost:5000/api";

export const apiRequest = async (
    endpoint,
    options = {}
)=>{
    const token = localStorage.getItem("authToken");
    // FormData body ho to Content-Type set karna nahi chahiye — browser khud
    // multipart boundary ke saath header laga deta hai.
    const isFormData = options.body instanceof FormData;
    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers:{
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
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