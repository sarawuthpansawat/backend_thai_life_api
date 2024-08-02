const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config();
// const { parse } = require('date-fns');
const app = express();
app.use(cors());
app.use(express.json());

//mongoose.connect('mongodb://localhost:27017/insurance', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: true
});

const policySchema = new mongoose.Schema({
  partner_code: Number,
  plan_code: String,
  policy_no: String,
  temp_policy_no: String,
  mode: Number,
  pay_period: Number,
  policy_status: String,
  policy_status_date: String,
  sum: Number
});

const Policy = mongoose.model('Policy', policySchema);

app.get('/api/policies', async (req, res) => {
    const { partnerCode, year, minAmount, maxAmount } = req.query;
  
    // Initialize query object
    const query = {};
  
    // Add partnerCode to query if provided
    if (partnerCode) {
      query.partner_code = partnerCode;
    }
  
  // Add date range to query if year is provided
  if (year) {
    // Use regex to match policies with the provided year in policy_status_date
    query.policy_status_date = {
      $regex: new RegExp(`^${year}`), // Matches dates where the year starts with the provided year
      $options: 'i' // Case insensitive (not strictly necessary for dates)
    };
  }
  
    // Add amount range to query if minAmount or maxAmount are provided
    if (!isNaN(minAmount) && !isNaN(maxAmount)) {
      query.sum = { $gte: Number(minAmount), $lte: Number(maxAmount) };
    } else if (!isNaN(minAmount)) {
      query.sum = { $gte: Number(minAmount) };
    } else if (!isNaN(maxAmount)) {
      query.sum = { $lte: Number(maxAmount) };
    }
  
    try {
      // Find policies based on query
      const policies = await Policy.find(query);
      res.json(policies);
    } catch (error) {
      console.error('Error fetching policies:', error);
      res.status(500).send('Error fetching policies');
    }
  });
  

const upload = multer({ dest: 'uploads/' });

app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data.xlsx'); // Assuming the CSV file is named 'data.xlsx' in the project root
    const workbook = xlsx.readFile(filePath);
    const sheet_name = workbook.SheetNames[0];
    const sheet_data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name]);

    // Convert policy_status_date to Date object if needed
    // sheet_data.forEach((record) => {
    //   if (record.policy_status_date) {
    //     record.policy_status_date = String(record.policy_status_date);
    //   }
    // });
    //console.log(String(record.policy_status_date));
     await Policy.insertMany(sheet_data);
    // const processedData = sheet_data.map(record => {
    //     return {
    //       partner_code: record.partner_code,
    //       plan_code: record.plan_code,
    //       policy_no: record.policy_no,
    //       temp_policy_no: record.temp_policy_no,
    //       mode: record.mode,
    //       pay_period: record.pay_period,
    //       policy_status: record.policy_status,
    //       policy_status_date: parse(record.policy_status_date, 'dd/MM/yyyy', new Date()),
    //       sum: record.sum
    //     };
    //   });
    // Insert into MongoDB
    //await Policy.insertMany(processedData);  
    res.status(200).send('Data imported successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).send('Error importing data');
  }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
