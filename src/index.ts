import express, { Request, Response } from "express";
import { deleteBank, getBank, getBankByISO2, insertBank } from "./db_queries";
import { mapJsonToBankType } from "./mapToBankType";
import { postBankType } from "../types/postBankType";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/v1/swift-codes/:swiftCode", async (req: Request, res: Response) => {
  const swiftCode = req.params.swiftCode;
  try {
    const bankData = await getBank(swiftCode);

    bankData ? res.status(200).json(bankData) : res.status(204).json(null);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(
  "/v1/swift-codes/country/:countryISO2code",
  async (req: Request, res: Response) => {
    const countryISO2code = req.params.countryISO2code;
    try {
      const bankData = await getBankByISO2(countryISO2code);
      bankData ? res.status(200).json(bankData) : res.status(204).json(null);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/v1/swift-codes", async (req: Request, res: Response) => {
  try {
    const recivedJsonData = req.body;
    const mappedData = mapJsonToBankType(recivedJsonData);
    const insertedData = await insertBank(mappedData);
    res.status(200).json(insertedData);
  } catch (error) {
    res.status(400).json({ error: error });
  }
});

app.delete(
  "/v1/swift-codes/:swiftCode",
  async (req: Request, res: Response) => {
    const swiftCode = req.params.swiftCode;
    try {
      const message = await deleteBank(swiftCode);
      res.status(message.includes("deleted") ? 200 : 404).json({ message });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({ error: "Wrong path" });
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
