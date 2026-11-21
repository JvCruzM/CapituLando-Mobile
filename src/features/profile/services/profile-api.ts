import { accountRequest } from "../../../shared/api/account";

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatarImage: string | null;
  penName: string;
  quote: string;
  websiteUrl: string;
  favoriteGenres: string[];
}

export function loadProfile(signal: AbortSignal) {
  return accountRequest<Profile>({ url: "/api/profile", signal });
}

export function saveProfile(data: Omit<Profile, "id" | "email">) {
  return accountRequest<Profile>({ url: "/api/profile", method: "PUT", data });
}
