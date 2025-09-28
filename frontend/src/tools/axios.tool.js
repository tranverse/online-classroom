import axios from "axios";

export const apiRequest = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

const axiosInstance = apiRequest.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {x
        return Promise.reject(error);
    }
)


async function service(url){
    const response = await url;

    if(response.success){
        return response.data.data
    }else{
        return response
    }

}