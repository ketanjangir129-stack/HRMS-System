import { configureStore } from "@reduxjs/toolkit";
import employeesReducer from "./employeesSlice";
import departmentsReducer from "./departmentsSlice";

/*
|--------------------------------------------------------------------------
| Store
|--------------------------------------------------------------------------
| Sirf wo data jo kai screens mein ek saath chahiye aur jise har screen
| alag-alag download karta tha. Theme, auth, role access aur manager scope
| apne Context mein hi hain — wo theek chal rahe hain, aur unhe yahan laane
| se sirf bojh badhta.
|
| Form, modal, search, filter aur pagination jaisi ek-screen ki cheezein
| bhi yahan nahi aati; unke liye local state hi sahi hai.
|
| DevTools sirf development mein. Employees record mein account ke andar
| password bhi hota hai, aur production mein browser extension se poori
| company ki list padhi ja sake — aisa nahi hona chahiye.
|--------------------------------------------------------------------------
*/

const store = configureStore({
  reducer: {
    employees: employeesReducer,
    // name : reducer,
    departments: departmentsReducer,
  },
  devTools: import.meta.env.DEV,
});

export default store;
