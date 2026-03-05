import UserAgent from "user-agents";

const userAgentGenerator = new UserAgent({
  deviceCategory: "desktop",
});

export const getRandomUserAgent = (): string => {
  return userAgentGenerator.toString();
};

export const generateUserAgent = (): string => {
  return userAgentGenerator.random().toString();
};
