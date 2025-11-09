import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AuthService from "@services/auth.service";
import authMemory from "@services/authMemory";

export interface User {
  id: string;
  name: string;
  email: string;
  token?: string;
  avatar?: string | null;
}

export interface UserState {
  user: User | null;
}

// Load persisted user from localStorage so login survives refresh.
const persistedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    return null;
  }
})();
const persistedToken = localStorage.getItem("token");
if (persistedUser) {
  // hydrate in-memory auth store from persisted values
  try {
    authMemory.setUser(persistedUser);
  } catch (e) {}
}
if (persistedToken) {
  try {
    authMemory.setToken(persistedToken);
  } catch (e) {}
}
const initialState: UserState = { user: persistedUser || null };

// Async thunk để login
export const loginUser = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>("user/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await AuthService.login(credentials);
    // assume AuthService.login trả về { success, data: { token, ...user }, message }
    if (response?.success) {
      // backend returns ApiResponse.data = AuthenticationResponse { token, user }
      const auth = response.data;
      // prefer auth.user if present
      const payload = auth?.user || auth || response;
      // if token present, attach to payload and store under 'token' key for axios
      const token = auth?.token || auth?.data?.token || null;
      if (token) {
        try {
          payload.token = token;
        } catch (e) {}
        // persist token and user in localStorage so login survives refresh
        try {
          localStorage.setItem("token", token);
        } catch (e) {}
        authMemory.setToken(token);
      }
      if (!payload || !payload.id) {
        return rejectWithValue(response.message || "Invalid login response");
      }
      // Persist user and also store in-memory
      try {
        localStorage.setItem("user", JSON.stringify(payload));
      } catch (e) {}
      authMemory.setUser(payload);
      return payload as User;
    }
    return rejectWithValue(response?.message || "Login failed");
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || err.message || "Login error"
    );
  }
});

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      // clear both in-memory and persisted auth
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } catch (e) {}
      authMemory.clear();
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      authMemory.setUser(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      loginUser.fulfilled,
      (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      }
    );
    builder.addCase(loginUser.rejected, (state) => {
      state.user = null;
      authMemory.clear();
    });
  },
});

export const { logout, setUser } = userSlice.actions;
export default userSlice.reducer;
