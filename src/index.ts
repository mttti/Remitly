import express, { Request, Response } from "express";
import { getBank } from "./db_queries";

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

app.use((req, res) => {
  res.status(404).json({ error: "Wrong path" });
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
