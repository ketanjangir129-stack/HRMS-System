import { createSlice } from "@reduxjs/toolkit";
import { subscribeEmployees } from "../services/EmployeeService";

/*
|--------------------------------------------------------------------------
| Employees Slice
|--------------------------------------------------------------------------
| Company ke employees ek hi jagah. Pehle har screen apna getEmployees()
| chalata tha — Attendance, Daily aur Monthly ek ke baad ek kholo to poori
| list teen baar download hoti thi. Ab ek listener hai, aur jitne screens
| chahein sab usi ko padhte hain.
|
| Realtime kyun, get-once cache kyun nahi: employees record sirf
| EmployeeService se nahi likha jaata — onboarding approval, password
| change/reset, profile edit, role change, sab alag jagah se likhte hain.
| Cache har us jagah se invalidate karna padta, aur ek bhi bhoolna data ko
| chup-chaap purana chhod deta. Listener ke saath koi bhi, kahin se bhi
| likhe — store apne aap taaza.
|
| State mein sirf data hai. Listener (unsubscribe function) serializable
| nahi hai, isliye wo neeche module ke andar rehta hai, store mein nahi.
|
| companyCode state mein isliye hai ki hook ek company ka data doosri
| company ke session ko kabhi na de.
|--------------------------------------------------------------------------
*/

const initialState = {
  companyCode: null,
  // Firebase ki shakal hi — { EMP001: {...} }
  data: {},
  // "idle" | "loading" | "ready" | "error"
  status: "idle",
  error: "",
};

const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    /*
    | Listener lag raha hai. Usi company ka data pehle se ho to wo rakha
    | jaata hai aur status "ready" hi rehta hai — screen turant purani list
    | dikhati hai, aur listener ki pehli khabar milisecond mein use taaza kar
    | deti hai. Spinner sirf tab, jab dikhane ko sach mein kuch na ho.
    */
    employeesLoading(state, action) {
      const companyCode = action.payload;
      const hasCache =
        state.companyCode === companyCode && state.status === "ready";

      state.companyCode = companyCode;
      state.error = "";

      if (!hasCache) {
        state.data = {};
        state.status = "loading";
      }
    },

    employeesReceived(state, action) {
      const { companyCode, data } = action.payload;

      // Beech mein company badal chuki ho to purani khabar nahi likhte
      if (state.companyCode !== companyCode) return;

      state.data = data;
      state.status = "ready";
      state.error = "";
    },

    /*
    | Wahi jo useEmployeeDirectory pehle karta tha: fail hone par list khaali
    | aur error message — aadha-purana data nahi.
    */
    employeesFailed(state, action) {
      const { companyCode, message } = action.payload;

      if (state.companyCode !== companyCode) return;

      state.data = {};
      state.status = "error";
      state.error = message;
    },

    resetEmployees() {
      return initialState;
    },
  },
});

export const {
  employeesLoading,
  employeesReceived,
  employeesFailed,
  resetEmployees,
} = employeesSlice.actions;

export default employeesSlice.reducer;

/*
|--------------------------------------------------------------------------
| Listener
|--------------------------------------------------------------------------
| Ek company, ek listener, aur ginti ki kitne screens use kar rahe hain.
|
| Pehla screen aata hai → listener lagta hai. Doosra aata hai → sirf ginti
| badhti hai, doosra download nahi. Aakhri jaata hai → listener band.
|
| Data band hone ke baad bhi store mein rehta hai: agla screen khulte hi
| wahi dikhta hai, aur naya listener use taaza kar deta hai. Sirf logout
| (stopEmployees) use mitata hai.
*/

let listener = null; // { companyCode, unsubscribe, count }

const startListener = (dispatch, companyCode) =>
  subscribeEmployees(
    companyCode,
    (data) => dispatch(employeesReceived({ companyCode, data })),
    (error) => {
      console.error("Failed to load employees:", error);

      dispatch(
        employeesFailed({
          companyCode,
          message: error?.message || "Failed to load employees.",
        })
      );
    }
  );

export const acquireEmployees = (companyCode) => (dispatch) => {
  if (!companyCode) return;

  if (listener && listener.companyCode === companyCode) {
    listener.count += 1;
    return;
  }

  // Doosri company ka listener chal raha tha — wo is session ka nahi
  if (listener) {
    listener.unsubscribe();
    listener = null;
  }

  dispatch(employeesLoading(companyCode));

  listener = {
    companyCode,
    unsubscribe: startListener(dispatch, companyCode),
    count: 1,
  };
};

export const releaseEmployees = (companyCode) => () => {
  // Kisi aur company ka release, ya logout ke baad aaya hua — kuch nahi karna
  if (!listener || listener.companyCode !== companyCode) return;

  listener.count -= 1;

  if (listener.count <= 0) {
    listener.unsubscribe();
    listener = null;
  }
};

/*
| "Retry" button ke liye. Listener dobara lagta hai par ginti wahi rehti
| hai — jitne screens use kar rahe the, utne hi abhi bhi kar rahe hain.
|
| Error ke baad cache hota hi nahi, isliye yahan spinner dikhta hai — wahi
| jo pehle Retry dabane par dikhta tha.
*/
export const restartEmployees = (companyCode) => (dispatch) => {
  if (!listener || listener.companyCode !== companyCode) return;

  listener.unsubscribe();

  dispatch(employeesLoading(companyCode));

  listener.unsubscribe = startListener(dispatch, companyCode);
};

/*
| Logout. Listener band aur data saaf — warna usi tab mein agla login
| pichhle user ki list memory mein pata. Listener pehle band hota hai, taaki
| reset ke baad koi der se aayi khabar store dobara na bhar de.
*/
export const stopEmployees = () => (dispatch) => {
  if (listener) {
    listener.unsubscribe();
    listener = null;
  }

  dispatch(resetEmployees());
};
