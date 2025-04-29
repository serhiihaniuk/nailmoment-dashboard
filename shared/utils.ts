import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractInstagramUsername = (inputString: string): string => {
  // Remove leading/trailing whitespace
  inputString = inputString.trim();

  // Regular expression pattern to match Instagram usernames
  const pattern =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?!p\/|explore\/|accounts\/)([A-Za-z0-9_.](?:(?:[A-Za-z0-9_.]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_])))?\/?/;

  // Try to find a match using the pattern
  const match = inputString.match(pattern);

  if (match && match[1]) {
    // If matched, return the captured username
    return match[1];
  } else {
    // If no match found, assume the input might be just the username
    // Remove any leading @ symbol and return
    return inputString.replace(/^@/, "");
  }
};

export function formatInstagramLink(instagram: string) {
  // Check if the string starts with "http" to determine if it's already a full link
  if (!instagram.startsWith("http")) {
    return `https://www.instagram.com/${instagram}`;
  }
  // If it's already a full link, return as is
  return instagram;
}

export function extractInstagramName(link: string) {
  // Remove the base URL
  let username = link.replace("https://www.instagram.com/", "");

  // Split by '/' and take the first part, which is the username
  username = username.split("/")[0];

  // If there are query parameters or hash fragments, ignore them
  username = username.split("?")[0];
  username = username.split("#")[0];

  return username;
}
