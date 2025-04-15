import { BankType } from "../types/bankType";
import { postBankType } from "../types/postBankType";

export function mapXlsToBankType(row: Array<string>) {
  const [
    countryISO2,
    swiftCode,
    codeType,
    bankName,
    address,
    city,
    country,
    timezone,
  ] = row;

  const mappedRow: BankType = {
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
  return mappedRow;
}

export function mapJsonToBankType(json: postBankType) {
  const mappedData: BankType = {
    address: json.address,
    bankName: json.bankName,
    location: {
      countryISO2: json.countryISO2.toUpperCase(),
      countryName: json.countryName.toUpperCase(),
      cityName: "",
      timeZone: "",
    },
    isHeadquarter: json.isHeadquarter,
    swiftCode: json.swiftCode,
    codeType: "",
    branches: null,
  };
  return mappedData;
}
