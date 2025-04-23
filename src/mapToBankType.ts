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
    address: address.trim(),
    bankName: bankName.trim(),
    location: {
      countryISO2: countryISO2.toUpperCase().trim(),
      countryName: country.toUpperCase().trim(),
      cityName: city.trim(),
      timeZone: timezone.trim(),
    },
    isHeadquarter: swiftCode.slice(-3) === "XXX" ? true : false,
    swiftCode: swiftCode.trim(),
    codeType: codeType.trim(),
    branches: null,
  };
  return mappedRow;
}

export function mapJsonToBankType(json: postBankType) {
  try {
    const mappedData: BankType = {
      address: json.address.trim(),
      bankName: json.bankName.trim(),
      location: {
        countryISO2: json.countryISO2.toUpperCase().trim(),
        countryName: json.countryName.toUpperCase().trim(),
        cityName: "",
        timeZone: "",
      },
      isHeadquarter: json.isHeadquarter,
      swiftCode: json.swiftCode.trim(),
      codeType: "",
      branches: null,
    };
    return mappedData;
  } catch (error) {
    throw "Invalid JSON data format";
  }
}
