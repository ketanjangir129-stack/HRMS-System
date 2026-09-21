import { createSlice } from "@reduxjs/toolkit";
import { subscribeDepartments } from "../services/departmentService";

/*
|--------------------------------------------------------------------------
| Departments Slice
|--------------------------------------------------------------------------
| Company ke departments (designations aur manager samet) ek hi jagah.
| employeesSlice wala hi pattern: ek realtime listener, aur jitne screens
| chahein sab usi ko padhte hain.
|
| Realtime isliye ki department node sirf Departments screen se nahi
| likha jaata — department import, manager assign/clear aur manager ka role
| hatna (releaseManagerFromDepartments) bhi yahin likhte hain. Listener ke
| saath koi bhi, kahin se bhi likhe — store apne aap taaza.
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
  // Firebase ki shakal hi — { departmentId: { name, designations, manager } }
  data: {},
  // "idle" | "loading" | "ready" | "error"
  status: "idle",
  error: "",
};

const departmentsSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    /*
    | Usi company ka data pehle se ho to wo rakha jaata hai aur status
    | "ready" hi rehta hai — screen turant purani list dikhati hai, aur
    | listener ki pehli khabar use taaza kar deti hai.
    */
    departmentsLoading(state, action) {
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

    departmentsReceived(state, action) {
      const { companyCode, data } = action.payload;

      // Beech mein company badal chuki ho to purani khabar nahi likhte
      if (state.companyCode !== companyCode) return;

      state.data = data;
      state.status = "ready";
      state.error = "";
    },

    departmentsFailed(state, action) {
      const { companyCode, message } = action.payload;

      if (state.companyCode !== companyCode) return;

      state.data = {};
      state.status = "error";
      state.error = message;
    },

    resetDepartments() {
      return initialState;
    },
  },
});

export const {
  departmentsLoading,
  departmentsReceived,
  departmentsFailed,
  resetDepartments,
} = departmentsSlice.actions;

export default departmentsSlice.reducer;

/*
|--------------------------------------------------------------------------
| Listener
|--------------------------------------------------------------------------
| Ek company, ek listener, aur ginti ki kitne screens use kar rahe hain.
| Pehla screen aata hai → listener lagta hai. Aakhri jaata hai → band.
| Data band hone ke baad bhi store mein rehta hai; sirf logout
| (stopDepartments) use mitata hai.
*/

let listener = null; // { companyCode, unsubscribe, count }

const startListener = (dispatch, companyCode) =>
  subscribeDepartments(
    companyCode,
    (data) => dispatch(departmentsReceived({ companyCode, data })),
    (error) => {
      console.error("Failed to load departments:", error);

      dispatch(
        departmentsFailed({
          companyCode,
          message: error?.message || "Failed to load departments.",
        })
      );
    }
  );

export const acquireDepartments = (companyCode) => (dispatch) => {
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

  dispatch(departmentsLoading(companyCode));

  listener = {
    companyCode,
    unsubscribe: startListener(dispatch, companyCode),
    count: 1,
  };
};

export const releaseDepartments = (companyCode) => () => {
  if (!listener || listener.companyCode !== companyCode) return;

  listener.count -= 1;

  if (listener.count <= 0) {
    listener.unsubscribe();
    listener = null;
  }
};

// "Retry" ke liye — listener dobara lagta hai, ginti wahi rehti hai
export const restartDepartments = (companyCode) => (dispatch) => {
  if (!listener || listener.companyCode !== companyCode) return;

  listener.unsubscribe();

  dispatch(departmentsLoading(companyCode));

  listener.unsubscribe = startListener(dispatch, companyCode);
};

/*
| Logout. Listener pehle band, phir data saaf — taaki reset ke baad koi der
| se aayi khabar store dobara na bhar de.
*/
export const stopDepartments = () => (dispatch) => {
  if (listener) {
    listener.unsubscribe();
    listener = null;
  }

  dispatch(resetDepartments());
};
