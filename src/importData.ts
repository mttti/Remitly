import { insertBank } from "./db_queries";
import xlsx from "xlsx";
import { mapXlsToBankType } from "./mapToBankType";
const FILENAME = "Interns_2025_SWIFT_CODES";

async function main() {
  // Uczyń główną funkcję asynchroniczną
  try {
    const workbook = xlsx.readFile(`${FILENAME}.xlsx`);
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const xlsxData: Array<Array<string>> = xlsx.utils.sheet_to_json(
      firstSheet,
      {
        header: 1,
      }
    );
    if (xlsxData[0].length === 0) {
      throw new Error("No data found in the Excel file.");
    }
    const convertedData = convertXlsxData(xlsxData.slice(1));
    async function insertAllData() {
      for (const row of convertedData) {
        await insertBank(row);
      }
    }
    await insertAllData(); // <--- DODANO AWAIT
    console.log("Data inserted successfully.");
    process.exit(0);
  } catch (error: any) {
    console.log("Error: ", error.message);
    process.exit(0);
  }
}

function convertXlsxData(xlsxData: Array<Array<string>>) {
  const convertedXlsxData = xlsxData.map((row) => {
    return mapXlsToBankType(row);
  });
  return convertedXlsxData;
}

main(); // Wywołaj asynchroniczną funkcję main
