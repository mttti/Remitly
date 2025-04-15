import { BankType } from "../types/bankType";
import { insertData } from "./db_queries";
import xlsx from "xlsx";
const FILENAME = "Interns_2025_SWIFT_CODES";

try {
  const workbook = xlsx.readFile(`${FILENAME}.xlsx`);
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const xlsxData: Array<Array<string>> = xlsx.utils.sheet_to_json(firstSheet, {
    header: 1,
  });
  if (xlsxData[0].length === 0) {
    throw new Error("No data found in the Excel file.");
  }
  const convertedData = convertXlsxData(xlsxData.slice(1));
  async function insertAllData() {
    for (const row of convertedData) {
      await insertData(row);
    }
  }
  insertAllData();
  console.log("Data inserted successfully.");
  process.exit(0);
} catch (error: any) {
  console.log("Error: ", error.message);
  process.exit(0);
}

function mapToType(xlsxRow: Array<string>) {
  const [
    countryISO2,
    swiftCode,
    codeType,
    bankName,
    address,
    city,
    country,
    timezone,
  ] = xlsxRow;

  const mappedXlsxRow: BankType = {
    address: address,
    bankName: bankName,
    location: {
      countryISO2: countryISO2.toUpperCase(),
      countryName: country.toUpperCase(),
      cityName: city,
      timeZone: timezone,
    },
    isHeadquarter: swiftCode.slice(-3) === "XXX" ? true : false,
    swiftCode: swiftCode,
    codeType: codeType,
    branches: null,
  };
  return mappedXlsxRow;
}

function convertXlsxData(xlsxData: Array<Array<string>>) {
  const convertedXlsxData = xlsxData.map((row) => {
    return mapToType(row);
  });
  return convertedXlsxData;
}
