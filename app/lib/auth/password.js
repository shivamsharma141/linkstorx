import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword,
  passwordHash
) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export async function hashCode(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

export async function compareCode(code, codeHash) {
  return bcrypt.compare(code, codeHash);
}