import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

export function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
    },
    getSecret(),
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    });
  } catch (error) {
    return null;
  }
}