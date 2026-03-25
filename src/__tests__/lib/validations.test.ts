import { describe, it, expect } from "vitest";
import {
  validatePhone,
  validatePAN,
  validateGST,
  validatePincode,
  validateEmail,
  validateIFSC,
  validateInstagramHandle,
  validateAadhar,
  validateBankAccount,
  validateUPI,
  formatPhone,
  getInstagramUrl,
  getYouTubeUrl,
} from "@/lib/validations";

describe("validatePhone", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validatePhone("")).toBe(true);
    expect(validatePhone(undefined as unknown as string)).toBe(true);
  });

  it.each([
    "9876543210",
    "+919876543210",
    "919876543210",
    "09876543210",
    "98765 43210",
  ])("should return true for valid phone: %s", (phone) => {
    expect(validatePhone(phone)).toBe(true);
  });

  it.each([
    ["1234567890", "starts with 1"],
    ["123", "too short"],
    ["abcdefghij", "letters"],
    ["98765432101", "11 digits"],
    ["+1234567890", "non-Indian prefix with invalid start digit"],
  ])("should return false for invalid phone: %s (%s)", (phone) => {
    expect(validatePhone(phone)).toBe(false);
  });
});

describe("validatePAN", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validatePAN("")).toBe(true);
    expect(validatePAN(undefined as unknown as string)).toBe(true);
  });

  it.each(["ABCDE1234F", "abcde1234f"])(
    "should return true for valid PAN: %s",
    (pan) => {
      expect(validatePAN(pan)).toBe(true);
    }
  );

  it.each([
    ["ABCDE123", "too short"],
    ["12345ABCDE", "wrong format"],
    ["ABCDE1234", "missing last letter"],
    ["ABCDE12345", "digit instead of letter at end"],
    ["ABCDE1234FG", "too long"],
  ])("should return false for invalid PAN: %s (%s)", (pan) => {
    expect(validatePAN(pan)).toBe(false);
  });
});

describe("validateGST", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateGST("")).toBe(true);
    expect(validateGST(undefined as unknown as string)).toBe(true);
  });

  it.each(["22AAAAA0000A1Z5", "07AABCU9603R1ZM"])(
    "should return true for valid GST: %s",
    (gst) => {
      expect(validateGST(gst)).toBe(true);
    }
  );

  it("should handle lowercase input via toUpperCase", () => {
    expect(validateGST("22aaaaa0000a1z5")).toBe(true);
  });

  it.each([
    ["ABCDE1234F", "PAN format, not GST"],
    ["22AAAAA0000A1Z", "too short (14 chars)"],
    ["123", "too short"],
  ])("should return false for invalid GST: %s (%s)", (gst) => {
    expect(validateGST(gst)).toBe(false);
  });
});

describe("validatePincode", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validatePincode("")).toBe(true);
    expect(validatePincode(undefined as unknown as string)).toBe(true);
  });

  it.each(["110001", "400001", "560001"])(
    "should return true for valid pincode: %s",
    (pincode) => {
      expect(validatePincode(pincode)).toBe(true);
    }
  );

  it.each([
    ["011000", "starts with 0"],
    ["1234", "too short"],
    ["12345678", "too long"],
    ["abcdef", "letters"],
  ])("should return false for invalid pincode: %s (%s)", (pincode) => {
    expect(validatePincode(pincode)).toBe(false);
  });
});

describe("validateEmail", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateEmail("")).toBe(true);
    expect(validateEmail(undefined as unknown as string)).toBe(true);
  });

  it.each(["test@example.com", "user.name+tag@domain.co.in", "a@b.co"])(
    "should return true for valid email: %s",
    (email) => {
      expect(validateEmail(email)).toBe(true);
    }
  );

  it.each([
    ["test@", "missing domain"],
    ["@domain.com", "missing local part"],
    ["test@.com", "dot immediately after @"],
    ["test", "no @ sign"],
  ])("should return false for invalid email: %s (%s)", (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});

describe("validateIFSC", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateIFSC("")).toBe(true);
    expect(validateIFSC(undefined as unknown as string)).toBe(true);
  });

  it.each(["HDFC0001234", "SBIN0012345", "ICIC0000001"])(
    "should return true for valid IFSC: %s",
    (ifsc) => {
      expect(validateIFSC(ifsc)).toBe(true);
    }
  );

  it.each([
    ["HDFC1001234", "5th char must be 0"],
    ["HDFC", "too short"],
    ["1234567890A", "starts with digits"],
  ])("should return false for invalid IFSC: %s (%s)", (ifsc) => {
    expect(validateIFSC(ifsc)).toBe(false);
  });
});

describe("validateInstagramHandle", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateInstagramHandle("")).toBe(true);
    expect(validateInstagramHandle(undefined as unknown as string)).toBe(true);
  });

  it.each(["username", "@username", "user.name", "user_name_123", "a"])(
    "should return true for valid handle: %s",
    (handle) => {
      expect(validateInstagramHandle(handle)).toBe(true);
    }
  );

  it.each([
    ["username with spaces", "contains spaces"],
    ["user@name", "contains @"],
    ["a".repeat(31), "too long (31 chars)"],
    ["user/name", "contains slash"],
  ])("should return false for invalid handle: %s (%s)", (handle) => {
    expect(validateInstagramHandle(handle)).toBe(false);
  });
});

describe("validateUPI", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateUPI("")).toBe(true);
    expect(validateUPI(undefined as unknown as string)).toBe(true);
  });

  it.each(["user@ybl", "myname@paytm", "9876543210@upi", "test.user-123@oksbi"])(
    "should return true for valid UPI: %s",
    (upi) => {
      expect(validateUPI(upi)).toBe(true);
    }
  );

  it.each([
    ["user", "no @ sign"],
    ["@ybl", "no username"],
    ["user@", "no bank code"],
    ["user@y", "bank code too short (1 char)"],
  ])("should return false for invalid UPI: %s (%s)", (upi) => {
    expect(validateUPI(upi)).toBe(false);
  });
});

describe("validateAadhar", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateAadhar("")).toBe(true);
    expect(validateAadhar(undefined as unknown as string)).toBe(true);
  });

  it.each(["123456789012", "1234 5678 9012"])(
    "should return true for valid Aadhar: %s",
    (aadhar) => {
      expect(validateAadhar(aadhar)).toBe(true);
    }
  );

  it.each([
    ["12345678901", "11 digits"],
    ["1234567890123", "13 digits"],
    ["abcdefghijkl", "letters"],
  ])("should return false for invalid Aadhar: %s (%s)", (aadhar) => {
    expect(validateAadhar(aadhar)).toBe(false);
  });
});

describe("validateBankAccount", () => {
  it("should return true for empty/undefined inputs (optional field)", () => {
    expect(validateBankAccount("")).toBe(true);
    expect(validateBankAccount(undefined as unknown as string)).toBe(true);
  });

  it.each([
    ["123456789", "9 digits (min)"],
    ["123456789012345678", "18 digits (max)"],
    ["12345678901234", "14 digits (mid-range)"],
  ])("should return true for valid bank account: %s (%s)", (account) => {
    expect(validateBankAccount(account)).toBe(true);
  });

  it.each([
    ["12345678", "8 digits (too short)"],
    ["1234567890123456789", "19 digits (too long)"],
    ["abcdefghi", "letters"],
  ])("should return false for invalid bank account: %s (%s)", (account) => {
    expect(validateBankAccount(account)).toBe(false);
  });
});

describe("formatPhone", () => {
  it('should format "9876543210" to "+91 98765 43210"', () => {
    expect(formatPhone("9876543210")).toBe("+91 98765 43210");
  });

  it('should format "+919876543210" to "+91 98765 43210"', () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("getInstagramUrl", () => {
  it('should return URL for handle without @', () => {
    expect(getInstagramUrl("username")).toBe("https://instagram.com/username");
  });

  it('should strip @ and return URL', () => {
    expect(getInstagramUrl("@username")).toBe("https://instagram.com/username");
  });
});

describe("getYouTubeUrl", () => {
  it('should prepend @ for plain channel name', () => {
    expect(getYouTubeUrl("channelname")).toBe("https://youtube.com/@channelname");
  });

  it('should not double-prefix @ handles', () => {
    expect(getYouTubeUrl("@channelname")).toBe("https://youtube.com/@channelname");
  });

  it('should use UC prefix directly for channel IDs', () => {
    expect(getYouTubeUrl("UCxxxxxxxxx")).toBe("https://youtube.com/UCxxxxxxxxx");
  });
});
