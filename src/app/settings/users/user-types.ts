import type { UserActionState } from "./actions";

export type ManagedUser = {
  id: string;
  email: string | null;
  role: "admin" | "viewer";
  isActive: boolean;
};

export type UserAction = (
  previousState: UserActionState,
  formData: FormData,
) => Promise<UserActionState>;
