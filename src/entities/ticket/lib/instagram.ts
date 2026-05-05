export const extractInstagramUsername = (inputString: string): string => {
  inputString = inputString.trim();

  const pattern =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?!p\/|explore\/|accounts\/)([A-Za-z0-9_.](?:(?:[A-Za-z0-9_.]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_])))?\/?/;

  const match = inputString.match(pattern);

  if (match && match[1]) {
    return match[1];
  }

  return inputString.replace(/^@/, "");
};

export function formatInstagramLink(instagram: string) {
  if (!instagram.startsWith("http")) {
    return `https://www.instagram.com/${instagram}`;
  }

  return instagram;
}

export function extractInstagramName(link: string) {
  let username = link.replace("https://www.instagram.com/", "");

  username = username.split("/")[0];
  username = username.split("?")[0];
  username = username.split("#")[0];

  return username;
}
