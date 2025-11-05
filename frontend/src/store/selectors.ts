import type { RootState } from "./index";

export const selectCurrentUser = (state: RootState) => state.user.user;
