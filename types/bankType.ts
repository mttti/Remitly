import { LocationType } from "./locationType";

export type BankType = {
  address: string | null;
  bankName: string;
  location: LocationType;
  isHeadquarter: boolean;
  swiftCode: string;
  codeType: string;
  branches: BankType[] | null;
};
