import axios from 'axios';
const instance = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.VITE_POD_DEPLOYMENT_URL);
console.log("hello")
export default instance;
