import {
  insertBank,
  getBank,
  getBankByISO2,
  deleteBank,
} from "../../src/db_queries";
const { Client } = require("pg");
import { BankType } from "../../types/bankType";

jest.mock("pg");
const mockedClient = jest.mocked(Client);
const mockQuery = jest.fn();
mockedClient.prototype.connect = jest.fn().mockResolvedValue(undefined);
mockedClient.prototype.end = jest.fn().mockResolvedValue(undefined);
mockedClient.prototype.query = mockQuery;

describe("Unit Tests for db_queries", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const mockBankData: BankType = {
    address: "Test Address",
    bankName: "Test Bank",
    location: {
      countryISO2: "US",
      countryName: "United States",
      cityName: "Test City",
      timeZone: "America/New_York",
    },
    isHeadquarter: true,
    swiftCode: "TESTUS00XXX",
    codeType: "TEST",
    branches: null,
  };

  describe("insertBank", () => {
    it("should insert a new headquarter bank and return success message", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 0 });

      const result = await insertBank(mockBankData);
      expect(result).toBe("Data inserted successfully");
      expect(mockQuery).toHaveBeenCalledTimes(4);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        "SELECT id FROM countries WHERE iso2 = $1",
        ["US"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "Select id FROM banks WHERE swift_code = $1",
        ["TESTUS00XXX"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id) VALUES ($1, $2, $3, $4, $5)",
        ["Test Bank", "Test Address", "TESTUS00XXX", true, 1]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        4,
        "UPDATE banks SET parent_id = (SELECT id FROM banks WHERE swift_code = $1) WHERE swift_code LIKE $2 AND parent_id IS NULL AND is_headquarter = FALSE",
        ["TESTUS00XXX", "TESTUS00%%"]
      );
    });

    it("should insert a new branch and return success message", async () => {
      const branchData: BankType = {
        ...mockBankData,
        isHeadquarter: false,
        swiftCode: "TESTUS00BR1",
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await insertBank(branchData);
      expect(result).toBe("Data inserted successfully");
      expect(mockQuery).toHaveBeenCalledTimes(4);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        "SELECT id FROM countries WHERE iso2 = $1",
        ["US"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "Select id FROM banks WHERE swift_code = $1",
        ["TESTUS00BR1"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        "SELECT id FROM banks WHERE swift_code = $1",
        ["TESTUS00XXX"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        4,
        "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id, parent_id) VALUES ($1, $2, $3, $4, $5,$6)",
        ["Test Bank", "Test Address", "TESTUS00BR1", false, 1, 2]
      );
    });

    it("should throw error if bank already exists", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(insertBank(mockBankData)).rejects.toBe(
        "bank already exists"
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        "SELECT id FROM countries WHERE iso2 = $1",
        [mockBankData.location.countryISO2]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "Select id FROM banks WHERE swift_code = $1",
        [mockBankData.swiftCode]
      );
    });

    it("should insert country if it does not exist", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 0 });

      await insertBank(mockBankData);
      expect(mockQuery).toHaveBeenCalledTimes(5);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "INSERT INTO countries (iso2, name, timezone) VALUES ($1, $2, $3) RETURNING id",
        ["US", "United States", "America/New_York"]
      );
    });
  });

  describe("getBank", () => {
    it("should return bank data for a non-headquarter swift code", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            address: "Branch Address",
            bankName: "Test Bank Branch",
            countryISO2: "US",
            countryName: "United States",
            isHeadquarter: false,
            swiftCode: "TESTUS00BR1",
          },
        ],
      });
      const bankData = await getBank("TESTUS00BR1");
      expect(bankData).toEqual({
        address: "Branch Address",
        bankName: "Test Bank Branch",
        countryISO2: "US",
        countryName: "United States",
        isHeadquarter: false,
        swiftCode: "TESTUS00BR1",
      });

      const expectedQuery = `
      SELECT
        b.id,
        b.name AS "bankName",
        b.address,
        b.swift_code AS "swiftCode",
        b.is_headquarter AS "isHeadquarter",
        b.parent_id,
        c.name AS "countryName",
        c.iso2 AS "countryISO2"
      FROM banks b
      JOIN countries c ON b.country_id = c.id WHERE b.swift_code LIKE $1 || '%'
    `
        .trim()
        .replace(/\s+/g, " ");

      const receivedQuery = mockQuery.mock.calls[0][0]
        .trim()
        .replace(/\s+/g, " ");

      expect(receivedQuery).toEqual(expectedQuery);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
        "TESTUS00BR1",
      ]);
    });

    it("should return headquarters data with branches", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            address: "HQ Address",
            bankName: "Test Bank HQ",
            countryISO2: "US",
            countryName: "United States",
            isHeadquarter: true,
            swiftCode: "TESTUS00XXX",
            parent_id: null,
          },
          {
            id: 2,
            address: "Branch1 Address",
            bankName: "Test Bank Branch 1",
            countryISO2: "US",
            countryName: "United States",
            isHeadquarter: false,
            swiftCode: "TESTUS00BR1",
            parent_id: 1,
          },
        ],
      });
      const bankData = await getBank("TESTUS00XXX");
      expect(bankData).toEqual({
        address: "HQ Address",
        bankName: "Test Bank HQ",
        countryISO2: "US",
        countryName: "United States",
        isHeadquarter: true,
        swiftCode: "TESTUS00XXX",
        branches: [
          {
            address: "Branch1 Address",
            bankName: "Test Bank Branch 1",
            countryISO2: "US",
            isHeadquarter: false,
            swiftCode: "TESTUS00BR1",
          },
        ],
      });

      const expectedQuery = `
      SELECT
        b.id,
        b.name AS "bankName",
        b.address,
        b.swift_code AS "swiftCode",
        b.is_headquarter AS "isHeadquarter",
        b.parent_id,
        c.name AS "countryName",
        c.iso2 AS "countryISO2"
      FROM banks b
      JOIN countries c ON b.country_id = c.id WHERE b.swift_code LIKE $1 || '%'
    `
        .trim()
        .replace(/\s+/g, " ");

      const receivedQuery = mockQuery.mock.calls[0][0]
        .trim()
        .replace(/\s+/g, " ");

      expect(receivedQuery).toEqual(expectedQuery);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["TESTUS00"]);
    });

    it("should return null if no bank data found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const bankData = await getBank("NONEXIST");
      expect(bankData).toBeNull();
    });
  });

  describe("getBankByISO2", () => {
    it("should return bank data for a given ISO2 code", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            address: "Bank Address",
            bankName: "Test Bank",
            countryISO2: "US",
            countryName: "United States",
            isHeadquarter: true,
            swiftCode: "TESTUS00XXX",
          },
        ],
      });
      const bankData = await getBankByISO2("US");
      expect(bankData).toEqual({
        countryISO2: "US",
        countryName: "United States",
        swiftCodes: [
          {
            address: "Bank Address",
            bankName: "Test Bank",
            countryISO2: "US",
            isHeadquarter: true,
            swiftCode: "TESTUS00XXX",
          },
        ],
      });

      const expectedQuery = `
      SELECT
        b.id,
        b.name AS "bankName",
        b.address,
        b.swift_code AS "swiftCode",
        b.is_headquarter AS "isHeadquarter",
        b.parent_id,
        c.name AS "countryName",
        c.iso2 AS "countryISO2"
      FROM banks b
      JOIN countries c ON b.country_id = c.id WHERE c.iso2 = $1
    `
        .trim()
        .replace(/\s+/g, " ");

      const receivedQuery = mockQuery.mock.calls[0][0]
        .trim()
        .replace(/\s+/g, " ");

      expect(receivedQuery).toEqual(expectedQuery);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["US"]);
    });
    it("should return null if no banks found for the ISO2 code", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const bankData = await getBankByISO2("ZZ");
      expect(bankData).toBeNull();
    });
  });

  describe("deleteBank", () => {
    it("should delete a bank and return success message if bank exists", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });
      const result = await deleteBank("TESTUS00XXX");
      expect(result).toBe(
        "Bank with swift code 'TESTUS00XXX' deleted successfully."
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        "DELETE FROM banks WHERE swift_code = $1",
        ["TESTUS00XXX"]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "UPDATE banks SET parent_id = NULL WHERE parent_id = $1",
        [1]
      );
    });

    it("should return not found message if bank does not exist", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(deleteBank("NONEXIST")).rejects.toThrow(
        "Bank with swift code 'NONEXIST' not found in the database."
      );

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id FROM banks WHERE swift_code = $1",
        ["NONEXIST"]
      );
      expect(mockQuery).not.toHaveBeenCalledWith(
        "UPDATE banks SET parent_id = NULL WHERE parent_id = $1"
      );
      expect(mockQuery).not.toHaveBeenCalledWith(
        "DELETE FROM banks WHERE swift_code = $1"
      );
    });

    it("should throw error if deletion fails", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(deleteBank("TESTUS00XXX")).rejects.toThrow(
        "Error deleting bank with swift code 'TESTUS00XXX'."
      );

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id FROM banks WHERE swift_code = $1",
        ["TESTUS00XXX"]
      );
    });
  });
});
