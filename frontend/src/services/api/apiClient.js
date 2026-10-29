import { API_URL } from "./apiConfig";


export const apiRequest = async (
    endpoint,
    options = {}
)=>{
    const token = localStorage.getItem("authToken");
    // FormData body ho to Content-Type set karna nahi chahiye — browser khud
    // multipart boundary ke saath header laga deta hai.
    const isFormData = options.body instanceof FormData;

    let response;
    try {
        response = await fetch(
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
    } catch (cause) {
        // Server tak pahunche hi nahi (net band, server down, CORS) — fetch ka
        // "Failed to fetch" user ko kuch nahi batata
        throw apiError("Cannot reach the server. Check your connection and try again.", 0, cause);
    }

    /*
    | Hamara backend hamesha JSON bhejta hai — success:false wala bhi, aur
    | caller usi ko padhta hai, isliye wo pehle jaisa lautta hai. JSON na ho
    | to beech mein kuch aur bola (proxy ka 502/504 HTML page, timeout) —
    | pehle yahan "Unexpected token <" jaisa SyntaxError phatta tha.
    */
    try {
        return await response.json();
    } catch (cause) {
        throw apiError(
            response.ok
                ? "The server sent an unexpected response. Please try again."
                : `The server is unavailable right now (${response.status}). Please try again in a moment.`,
            response.status,
            cause
        );
    }
};

const apiError = (message, status, cause) => {
    const error = new Error(message, { cause });
    error.status = status;
    return error;
};