import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A real cost-12 hash of a random string nobody knows. Sign-in compares
 * against it when an address has no password, so a missing account takes
 * as long to refuse as a wrong password and the timing gives nothing away.
 */
const NO_ACCOUNT_HASH = "$2b$12$7cCHvp74y5jbZGvZHfAjlOkx0L1pymqTOnE21z32xkKuYv4dt6cB6";

export async function spendPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, NO_ACCOUNT_HASH);
}
