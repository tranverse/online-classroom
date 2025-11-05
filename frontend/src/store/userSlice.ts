import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AuthService from "@services/auth.service";

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

// Load user từ localStorage khi app khởi tạo
const persistedUser = localStorage.getItem("user");
const initialState: UserState = {
  user: persistedUser ? JSON.parse(persistedUser) : null,
};

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
        } catch (e) {
          // ignore
        }
        localStorage.setItem("token", token);
      }
      if (!payload || !payload.id) {
        return rejectWithValue(response.message || "Invalid login response");
      }
      // Persist user object (with token included when present)
      localStorage.setItem("user", JSON.stringify(payload));
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
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
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
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    });
  },
});

export const { logout, setUser } = userSlice.actions;
export default userSlice.reducer;
