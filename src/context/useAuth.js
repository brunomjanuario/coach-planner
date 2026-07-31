import { useContext } from "react";
import { AuthContext } from "./AuthContextInstance";

export function useAuth() {
  return useContext(AuthContext);
}
