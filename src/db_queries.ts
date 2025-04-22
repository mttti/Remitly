const { Client } = require("pg");
import { BankType } from "../types/bankType";
import connectionData from "./dbConnection";

export async function insertBank(bankData: BankType) {
  try {
    const client = new Client(connectionData);
    await client.connect();

    let countryIdResult = await client.query(
      `SELECT id FROM countries WHERE iso2 = $1`,
      [bankData.location.countryISO2]
    );

    let countryId;
    if (countryIdResult.rows.length > 0) {
      countryId = countryIdResult.rows[0].id;
    } else {
      let countryInsertResult = await client.query(
        "INSERT INTO countries (iso2, name, timezone) VALUES ($1, $2, $3) RETURNING id",
        [
          bankData.location.countryISO2,
          bankData.location.countryName,
          bankData.location.timeZone,
        ]
      );
      countryId = countryInsertResult.rows[0].id;
    }

    let bankIdResult = await client.query(
      "Select id FROM banks WHERE swift_code = $1",
      [bankData.swiftCode]
    );

    if (bankIdResult.rows.length > 0) {
      console.log("Bank already exists:", bankData.swiftCode);
      throw "Bank already exists";
    }

    if (bankData.isHeadquarter) {
      await client.query(
        "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id) VALUES ($1, $2, $3, $4, $5)",
        [
          bankData.bankName,
          bankData.address,
          bankData.swiftCode,
          bankData.isHeadquarter,
          countryId,
        ]
      );
      await client.query(
        "UPDATE banks SET parent_id = (SELECT id FROM banks WHERE swift_code = $1) WHERE swift_code LIKE $2 AND parent_id IS NULL",
        [bankData.swiftCode, bankData.swiftCode.slice(0, 8) + "%%"]
      );
    } else {
      let parentBankId = await client.query(
        "SELECT id FROM banks WHERE swift_code = $1",
        [bankData.swiftCode.slice(0, 8) + "XXX"]
      );
      if (parentBankId.rows.length > 0) {
        await client.query(
          "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id, parent_id) VALUES ($1, $2, $3, $4, $5,$6)",
          [
            bankData.bankName,
            bankData.address,
            bankData.swiftCode,
            bankData.isHeadquarter,
            countryId,
            parentBankId.rows[0]?.id || null,
          ]
        );
      } else {
        await client.query(
          "INSERT INTO banks (name, address, swift_code, is_headquarter, country_id) VALUES ($1, $2, $3, $4, $5)",
          [
            bankData.bankName,
            bankData.address,
            bankData.swiftCode,
            bankData.isHeadquarter,
            countryId,
          ]
        );
      }
    }
    await client.end();
    return "Data inserted successfully";
  } catch (err) {
    console.error("An error occured", err);
    throw err;
  }
}

export async function getBank(swiftCode: string) {
  const isHeadquarter = swiftCode.slice(-3) === "XXX" ? true : false;
  try {
    const client = new Client(connectionData);
    await client.connect();
    const result = await client.query(
      `
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
      JOIN countries c ON b.country_id = c.id WHERE b.swift_code LIKE $1 || '%';
  `,
      [isHeadquarter ? swiftCode.slice(0, 8) : swiftCode]
    );

    const rows = result.rows;
    if (rows.length === 0) return null;
    if (!isHeadquarter) {
      return {
        address: rows[0].address,
        bankName: rows[0].bankName,
        countryISO2: rows[0].countryISO2,
        countryName: rows[0].countryName,
        isHeadquarter: rows[0].isHeadquarter,
        swiftCode: rows[0].swiftCode,
      };
    }

    const headquartersMap: any = {};

    for (const row of rows) {
      if (row.isHeadquarter) {
        headquartersMap[row.id] = {
          address: row.address,
          bankName: row.bankName,
          countryISO2: row.countryISO2,
          countryName: row.countryName,
          isHeadquarter: row.isHeadquarter,
          swiftCode: row.swiftCode,
          branches: [],
        };
      }
    }

    for (const row of rows) {
      if (!row.isHeadquarter && row.parent_id) {
        const hq = headquartersMap[row.parent_id];
        if (hq) {
          hq.branches.push({
            address: row.address,
            bankName: row.bankName,
            countryISO2: row.countryISO2,
            isHeadquarter: row.isHeadquarter,
            swiftCode: row.swiftCode,
          });
        }
      }
    }

    await client.end();
    return Object.values(headquartersMap)[0];
  } catch (error: any) {
    console.error("Error fetching bank data:", error);
    throw new Error(error);
  }
}

export async function getBankByISO2(countryISO2code: string) {
  try {
    const client = new Client(connectionData);
    await client.connect();
    const result = await client.query(
      `
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
      JOIN countries c ON b.country_id = c.id WHERE c.iso2 = $1;
  `,
      [countryISO2code]
    );

    const rows = result.rows;
    if (rows.length === 0) return null;
    await client.end();

    return {
      countryISO2: rows[0].countryISO2,
      countryName: rows[0].countryName,
      swiftCodes: rows.map((row: any) => ({
        address: row.address,
        bankName: row.bankName,
        countryISO2: row.countryISO2,
        isHeadquarter: row.isHeadquarter,
        swiftCode: row.swiftCode,
      })),
    };
  } catch (error: any) {
    console.error("Error fetching bank data:", error);
    return error;
  }
}

export async function deleteBank(swiftCode: string) {
  const client = new Client(connectionData);
  try {
    await client.connect();

    const bankToDeleteResult = await client.query(
      "SELECT id FROM banks WHERE swift_code = $1",
      [swiftCode]
    );

    if (bankToDeleteResult.rows.length === 0) {
      await client.end();
      return `Bank with swift code '${swiftCode}' not found in the database.`;
    }
    const bankToDeleteId = bankToDeleteResult.rows[0].id;

    const updateParentResult = await client.query(
      "UPDATE banks SET parent_id = NULL WHERE parent_id = $1",
      [bankToDeleteId]
    );

    console.log(
      `Updated ${updateParentResult.rowCount} banks' parent_id to NULL.`
    );

    const deleteResult = await client.query(
      "DELETE FROM banks WHERE swift_code = $1",
      [swiftCode]
    );

    if (deleteResult.rowCount > 0) {
      return `Bank with swift code '${swiftCode}' deleted successfully.`;
    } else {
      return `Error deleting bank with swift code '${swiftCode}'.`;
    }
  } catch (error: any) {
    console.error(`Error deleting bank with swift code '${swiftCode}':`, error);
    throw new Error(
      `Error deleting bank with swift code '${swiftCode}': ${error.message}`
    );
  } finally {
    await client.end();
  }
}
