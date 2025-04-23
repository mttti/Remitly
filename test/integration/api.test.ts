import request from "supertest";
import { app } from "../../src/api";
const { Client } = require("pg");

const testDatabaseConfig = {
  user: "postgres",
  host: "test_db",
  database: "postgres_test",
  password: "mysecretpassword",
  port: parseInt("5432"),
};

async function cleanDatabase() {
  const client = new Client(testDatabaseConfig);
  try {
    await client.connect();
    await client.query("DELETE FROM banks");
    await client.query("DELETE FROM countries");
    await client.end();
  } catch (error) {
    console.error("Error cleaning database:", error);
  } finally {
    await client.end();
  }
}

describe("Integration Tests for API Endpoints", () => {
  beforeEach(async () => {
    await cleanDatabase();

    const client = new Client(testDatabaseConfig);
    try {
      await client.connect();
      await client.query("ALTER SEQUENCE banks_id_seq RESTART WITH 1");
      await client.query(
        "ALTER SEQUENCE IF EXISTS countries_id_seq RESTART WITH 1"
      );
      await client.query(
        "INSERT INTO countries (iso2, name, timezone) VALUES ($1, $2, $3)",
        ["US", "United States", "America/New_York"]
      );
      await client.query(
        "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id) VALUES ($1, $2, $3, $4, $5)",
        ["Test Bank HQ", "123 Main St", "TESTUS00XXX", true, 1]
      );
      await client.query(
        "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id, parent_id) VALUES ($1, $2, $3, $4, $5, $6)",
        ["Test Bank Branch", "456 Side Rd", "TESTUS00BR1", false, 1, 1]
      );
    } catch (error) {
      console.error("Error inserting test data:", error);
    } finally {
      await client.end();
    }
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe("GET /v1/swift-codes/:swiftCode", () => {
    it("should return 200 and bank data for an existing swift code", async () => {
      const response = await request(app).get("/v1/swift-codes/TESTUS00BR1");
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("swiftCode", "TESTUS00BR1");
      expect(response.body).toHaveProperty("bankName", "Test Bank Branch");
    });

    it("should return 204 for a non-existent swift code", async () => {
      const response = await request(app).get("/v1/swift-codes/NONEXIST");
      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it("should return 500 for internal server error", async () => {
      jest
        .spyOn(Client.prototype, "connect")
        .mockRejectedValue(new Error("Database connection error"));
      const response = await request(app).get("/v1/swift-codes/TESTUS00BR1");
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal server error");
      jest.restoreAllMocks();
    });
  });

  describe("GET /v1/swift-codes/country/:countryISO2code", () => {
    it("should return 200 and bank data for an existing country ISO2 code", async () => {
      const response = await request(app).get("/v1/swift-codes/country/US");
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.swiftCodes)).toBe(true);
      expect(response.body.swiftCodes.length).toBeGreaterThanOrEqual(2);
      expect(response.body.swiftCodes[0].swiftCode === "TESTUS00XXX").toBe(
        true
      );
      expect(response.body.swiftCodes[1].swiftCode === "TESTUS00BR1").toBe(
        true
      );
    });

    it("should return 204 for a non-existent country ISO2 code", async () => {
      const response = await request(app).get("/v1/swift-codes/country/XX");
      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it("should return 500 for internal server error", async () => {
      jest
        .spyOn(Client.prototype, "connect")
        .mockRejectedValue(new Error("Database connection error"));
      const response = await request(app).get("/v1/swift-codes/country/US");
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal server error");
      jest.restoreAllMocks();
    });
  });

  describe("POST /v1/swift-codes", () => {
    const newBankData = {
      address: "789 Another Rd",
      bankName: "New Test Bank",
      countryISO2: "PL",
      countryName: "Poland",
      isHeadquarter: true,
      swiftCode: "NEWPL00XXX",
    };

    it("should return 200 and success message after successfully inserting a new bank", async () => {
      let response = await request(app).get("/v1/swift-codes/country/PL");
      expect(response.statusCode).toBe(204);

      response = await request(app)
        .post("/v1/swift-codes")
        .send(newBankData)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("Data inserted successfully");

      const client = new Client(testDatabaseConfig);
      try {
        await client.connect();
        const result = await client.query(
          "SELECT * FROM banks WHERE swift_code = $1",
          ["NEWPL00XXX"]
        );
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].name).toBe("New Test Bank");
      } finally {
        await client.end();
      }
    });

    it("should return 400 if there is an error during insertion", async () => {
      const invalidBankData = {
        address: "789 Another Rd",
        bankName: "New Test Bank",
        countryISO2: "PL",
        countryName: 123,
        isHeadquarter: true,
        swiftCode: "NEVPL00XXX",
      };
      const response = await request(app)
        .post("/v1/swift-codes")
        .send(invalidBankData)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /v1/swift-codes/:swiftCode", () => {
    it("should return 200 and success message if bank is successfully deleted", async () => {
      const response = await request(app).delete("/v1/swift-codes/TESTUS00BR1");
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Bank with swift code TESTUS00BR1 deleted successfully"
      );

      const client = new Client(testDatabaseConfig);
      try {
        await client.connect();
        const result = await client.query(
          "SELECT * FROM banks WHERE swift_code = $1",
          ["TESTUS00BR1"]
        );
        expect(result.rows.length).toBe(0);
      } finally {
        await client.end();
      }
    });

    it("should return 500 for internal server error", async () => {
      jest
        .spyOn(Client.prototype, "connect")
        .mockRejectedValue(new Error("Database connection error"));
      const response = await request(app).delete("/v1/swift-codes/TESTUS00XXX");
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal server error");
      jest.restoreAllMocks();
    });
  });

  describe("404 - Wrong Path", () => {
    it("should return 404 for an invalid path", async () => {
      const response = await request(app).get("/v1/wrong-path");
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty("error", "Wrong path");
    });
  });
});
